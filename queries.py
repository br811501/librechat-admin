from db import get_db
from datetime import datetime
from bson import ObjectId
import re

def _clean(obj):
    """Converte ObjectIds e datas em string recursivamente"""
    if isinstance(obj, list):
        return [_clean(x) for x in obj]
    if isinstance(obj, dict):
        return {k: _clean(v) for k, v in obj.items()}
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj

def resumo_geral():
    db = get_db()

    def listar_usuarios(filtro_credits):
        return list(db.balances.aggregate([
            {"$match": filtro_credits},
            {"$addFields": {
                "userObjId": {
                    "$cond": [
                        {"$eq": [{"$type": "$user"}, "string"]},
                        {"$toObjectId": "$user"},
                        "$user"
                    ]
                }
            }},
            {"$lookup": {
                "from": "users",
                "localField": "userObjId",
                "foreignField": "_id",
                "as": "user_info"
            }},
            {"$unwind": {"path": "$user_info", "preserveNullAndEmptyArrays": True}},
            {"$project": {
                "_id": 0,
                "nome": "$user_info.name",
                "username": "$user_info.username",
                "email": "$user_info.email",
                "tokenCredits": 1
            }},
            {"$sort": {"tokenCredits": 1}}
        ]))

    saldo_baixo_list = listar_usuarios({"tokenCredits": {"$gt": 0, "$lt": 100000}})
    saldo_zerado_list = listar_usuarios({"tokenCredits": {"$lte": 0}})

    return {
        "saldo_baixo": len(saldo_baixo_list),
        "saldo_zerado": len(saldo_zerado_list),
        "saldo_baixo_list": saldo_baixo_list,
        "saldo_zerado_list": saldo_zerado_list,
        "total_usuarios": db.users.count_documents({}),
    }

def ranking_gastos(inicio: datetime, fim: datetime, top=10):
    db = get_db()
    pipeline = [
        {"$match": {
            "createdAt": {"$gte": inicio, "$lte": fim},
            "tokenType": {"$in": ["prompt", "completion"]}
        }},
        {"$group": {
            "_id": {"user": "$user", "model": "$model"},
            "gasto": {"$sum": {"$abs": "$tokenValue"}}
        }},
        {"$sort": {"gasto": -1}},
        {"$group": {
            "_id": "$_id.user",
            "total_gasto": {"$sum": "$gasto"},
            "modelo_top": {"$first": "$_id.model"},
            "gasto_modelo_top": {"$first": "$gasto"}
        }},
        {"$sort": {"total_gasto": -1}},
        {"$limit": top},
        {"$lookup": {"from": "users", "localField": "_id",
                    "foreignField": "_id", "as": "u"}},
        {"$unwind": "$u"},
        {"$project": {
            "_id": 1, "total_gasto": 1, "modelo_top": 1, "gasto_modelo_top": 1,
            "nome": "$u.name", "email": "$u.email", "username": "$u.username"
        }}
    ]
    return _clean(list(db.transactions.aggregate(pipeline)))

def buscar_usuarios(termo):
    db = get_db()
    docs = list(db.users.find({
        "$or": [
            {"email": {"$regex": termo, "$options": "i"}},
            {"name": {"$regex": termo, "$options": "i"}},
            {"username": {"$regex": termo, "$options": "i"}}
        ]
    }).sort("name", 1).limit(50))

    for u in docs:
        bal = db.balances.find_one({"user": u["_id"]})
        u["tokenCredits"] = bal["tokenCredits"] if bal else 0

    return _clean(docs)


# ============================================================
# 💬 NOVO: CONVERSAS DO USUÁRIO
# ============================================================

def listar_conversas(username, inicio=None, fim=None):
    db = get_db()
    user = db.users.find_one({"username": username})
    if not user:
        return {"erro": f"Usuário '{username}' não encontrado"}

    uid = str(user["_id"])
    match = {"user": uid}
    if inicio or fim:
        rng = {}
        if inicio: rng["$gte"] = inicio
        if fim:    rng["$lte"] = fim
        match["createdAt"] = rng

    convs = list(db.messages.aggregate([
        {"$match": match},
        {"$group": {
            "_id": "$conversationId",
            "ultima": {"$max": "$createdAt"},
            "primeira": {"$min": "$createdAt"},
            "qtd": {"$sum": 1},
            "model": {"$last": "$model"},
        }},
        {"$sort": {"ultima": -1}},
        {"$limit": 200},
    ]))

    ids = [c["_id"] for c in convs]
    titulos = {c["conversationId"]: c.get("title")
            for c in db.conversations.find(
                {"conversationId": {"$in": ids}},
                {"conversationId": 1, "title": 1})}

    for c in convs:
        c["conversationId"] = c["_id"]
        c["title"] = titulos.get(c["_id"]) or "(sem título)"

    return {
        "usuario": {
            "nome": user.get("name"),
            "username": username,
            "email": user.get("email"),
            "_id": uid,
        },
        "conversas": _clean(convs),
    }


def buscar_mensagens(conversation_id, inicio=None, fim=None, texto=None):
    db = get_db()
    match = {"conversationId": conversation_id}
    if inicio or fim:
        rng = {}
        if inicio: rng["$gte"] = inicio
        if fim:    rng["$lte"] = fim
        match["createdAt"] = rng
    if texto:
        match["text"] = {"$regex": re.escape(texto), "$options": "i"}

    msgs = list(db.messages.find(match).sort("createdAt", 1))
    return _clean([_parse_msg(m) for m in msgs])


def _parse_msg(m):
    """Separa texto final / thinking / tool. Cobre formato string (antigo)
    e formato content=array (novo)."""
    blocos = []
    content = m.get("content")

    if isinstance(content, list):  # formato novo (array de partes)
        for parte in content:
            if not isinstance(parte, dict):
                blocos.append({"tipo": "texto", "conteudo": str(parte)})
                continue
            t = parte.get("type")
            if t == "text":
                blocos.append({"tipo": "texto", "conteudo": parte.get("text", "")})
            elif t in ("think", "thinking", "reasoning"):
                blocos.append({"tipo": "thinking",
                "conteudo": parte.get("think") or parte.get("text", "")})
            elif t in ("tool_call", "tool_result", "tool_use"):
                blocos.append({"tipo": "tool", "conteudo": parte})
            else:
                blocos.append({"tipo": "tool", "conteudo": parte})
    else:  # formato antigo (string em text, com <think>...</think>)
        texto = m.get("text", "") or ""
        for th in re.findall(r"<think>(.*?)</think>", texto, re.S):
            if th.strip():
                blocos.append({"tipo": "thinking", "conteudo": th.strip()})
        texto_limpo = re.sub(r"<think>.*?</think>", "", texto, flags=re.S).strip()
        if texto_limpo:
            blocos.append({"tipo": "texto", "conteudo": texto_limpo})

    if not blocos:
        blocos.append({"tipo": "texto", "conteudo": "(vazio)"})

    return {
        "messageId": m.get("messageId"),
        "isUser": m.get("isCreatedByUser", False),
        "sender": m.get("sender"),
        "model": m.get("model"),
        "createdAt": m.get("createdAt"),
        "blocos": blocos,
    }