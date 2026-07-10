from db import get_db
from datetime import datetime, timedelta
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


def atividade_usuarios(inicio: datetime, fim: datetime):
    db = get_db()

    inicio_str = inicio.strftime("%Y-%m-%d")
    fim_str = fim.strftime("%Y-%m-%d")

    def date_range_match(field_name="$createdAt"):
        return {
            "$expr": {
                "$and": [
                    {"$gte": [{"$dateToString": {"format": "%Y-%m-%d", "date": field_name}}, inicio_str]},
                    {"$lte": [{"$dateToString": {"format": "%Y-%m-%d", "date": field_name}}, fim_str]},
                ]
            }
        }

    match = date_range_match()
    user_match = {
        **date_range_match(),
        "$or": [
            {"isCreatedByUser": True},
            {"isUser": True},
        ],
    }

    def user_ref_pipeline():
        return [
            {"$addFields": {
                "userObjId": {
                    "$cond": [
                        {"$eq": [{"$type": "$user"}, "string"]},
                        {"$toObjectId": "$user"},
                        "$user"
                    ]
                }
            }}
        ]

    daily_counts = list(db.messages.aggregate([
        {"$match": match},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$createdAt"}},
            "mensagens": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
    ]))

    daily_heavy_users = list(db.messages.aggregate([
        {"$match": user_match},
        *user_ref_pipeline(),
        {"$group": {
            "_id": {
                "dia": {"$dateToString": {"format": "%Y-%m-%d", "date": "$createdAt"}},
                "user": "$userObjId",
            },
            "mensagens": {"$sum": 1},
        }},
        {"$match": {"mensagens": {"$gt": 10}}},
        {"$group": {
            "_id": "$_id.dia",
            "usuarios_acima_10": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
    ]))

    heavy_users = list(db.messages.aggregate([
        {"$match": user_match},
        *user_ref_pipeline(),
        {"$group": {
            "_id": {
                "dia": {"$dateToString": {"format": "%Y-%m-%d", "date": "$createdAt"}},
                "user": "$userObjId",
            },
            "mensagens": {"$sum": 1},
        }},
        {"$match": {"mensagens": {"$gt": 10}}},
        {"$group": {
            "_id": "$_id.user",
            "dias_acima": {"$sum": 1},
            "max_mensagens_dia": {"$max": "$mensagens"},
            "total_mensagens": {"$sum": "$mensagens"},
            "dias": {"$push": "$_id.dia"},
        }},
        {"$lookup": {
            "from": "users",
            "localField": "_id",
            "foreignField": "_id",
            "as": "u",
        }},
        {"$unwind": {"path": "$u", "preserveNullAndEmptyArrays": True}},
        {"$project": {
            "_id": 1,
            "dias_acima": 1,
            "max_mensagens_dia": 1,
            "total_mensagens": 1,
            "dias": 1,
            "nome": "$u.name",
            "email": "$u.email",
            "username": "$u.username",
        }},
        {"$sort": {"dias_acima": -1, "max_mensagens_dia": -1, "total_mensagens": -1}},
    ]))

    total_days = 0
    current = inicio.date()
    end = fim.date()
    series = []
    counts_by_day = {d["_id"]: d["mensagens"] for d in daily_counts}
    heavy_by_day = {d["_id"]: d["usuarios_acima_10"] for d in daily_heavy_users}

    while current <= end:
        day = current.isoformat()
        series.append({
            "dia": day,
            "mensagens": counts_by_day.get(day, 0),
            "usuarios_acima_10": heavy_by_day.get(day, 0),
        })
        total_days += 1
        current += timedelta(days=1)

    return _clean({
        "periodo": {
            "inicio": inicio.strftime("%Y-%m-%d"),
            "fim": fim.strftime("%Y-%m-%d"),
        },
        "total_mensagens": sum(item["mensagens"] for item in series),
        "total_usuarios_acima_10": len(heavy_users),
        "media_usuarios_acima_10": round(
            sum(item["usuarios_acima_10"] for item in series) / total_days if total_days else 0,
            2,
        ),
        "dias_com_usuarios_acima_10": sum(1 for item in series if item["usuarios_acima_10"] > 0),
        "dias": series,
        "usuarios_acima_10": heavy_users,
    })


# ============================================================
# 💬 NOVO: CONVERSAS DO USUÁRIO
# ============================================================

def _history_conversations(user_id, inicio=None, fim=None):
    db = get_db()
    match = {"user": user_id}
    if inicio or fim:
        rng = {}
        if inicio: rng["$gte"] = inicio
        if fim:    rng["$lte"] = fim
        match["$or"] = [
            {"createdAt": rng},
            {"updatedAt": rng},
            {"deletedAt": rng},
        ]

    docs = list(db.conversationhistories.find(
        match,
        {"conversationId": 1, "originalConversationId": 1, "title": 1,
        "model": 1, "createdAt": 1, "updatedAt": 1,
        "deletedAt": 1, "fullMessages": 1}
    ).sort("updatedAt", -1).limit(200))

    results = []
    for doc in docs:
        cid = doc.get("originalConversationId") or doc.get("conversationId")
        if not cid:
            continue

        messages = doc.get("fullMessages") or []
        timestamps = [m.get("createdAt") for m in messages if m.get("createdAt")]
        primeira = min(timestamps) if timestamps else doc.get("createdAt")
        ultima = max(timestamps) if timestamps else doc.get("updatedAt") or doc.get("createdAt")

        results.append({
            "_id": cid,
            "conversationId": cid,
            "title": doc.get("title") or "(sem título)",
            "model": doc.get("model"),
            "qtd": len(messages),
            "primeira": primeira,
            "ultima": ultima,
            "deleted": bool(doc.get("deletedAt")),
        })
    return results


def _history_conversations(user_id=None, inicio=None, fim=None, texto=None):
    db = get_db()
    filters = []
    if user_id:
        filters.append({"user": user_id})
    if texto:
        regex = {"$regex": re.escape(texto), "$options": "i"}
        filters.append({"$or": [
            {"fullMessages.text": regex},
            {"title": regex},
        ]})
    if inicio or fim:
        rng = {}
        if inicio: rng["$gte"] = inicio
        if fim: rng["$lte"] = fim
        filters.append({"$or": [
            {"createdAt": rng},
            {"updatedAt": rng},
            {"deletedAt": rng},
        ]})

    match = {"$and": filters} if len(filters) > 1 else (filters[0] if filters else {})

    docs = list(db.conversationhistories.find(
        match,
        {"conversationId": 1, "originalConversationId": 1, "title": 1,
        "model": 1, "createdAt": 1, "updatedAt": 1,
        "deletedAt": 1, "fullMessages": 1}
    ).sort("updatedAt", -1).limit(200))

    results = []
    for doc in docs:
        cid = doc.get("originalConversationId") or doc.get("conversationId")
        if not cid:
            continue

        messages = doc.get("fullMessages") or []
        timestamps = [m.get("createdAt") for m in messages if m.get("createdAt")]
        primeira = min(timestamps) if timestamps else doc.get("createdAt")
        ultima = max(timestamps) if timestamps else doc.get("updatedAt") or doc.get("createdAt")

        results.append({
            "_id": cid,
            "conversationId": cid,
            "title": doc.get("title") or "(sem título)",
            "model": doc.get("model"),
            "qtd": len(messages),
            "primeira": primeira,
            "ultima": ultima,
            "deleted": bool(doc.get("deletedAt")),
        })
    return results


def listar_conversas(username=None, inicio=None, fim=None, texto=None):
    db = get_db()
    user = None
    uid = None
    if username:
        user = db.users.find_one({"username": username})
        if not user:
            return {"erro": f"Usuário '{username}' não encontrado"}
        uid = str(user["_id"])

    match = {}
    if uid:
        match["user"] = uid
    if texto:
        match["text"] = {"$regex": re.escape(texto), "$options": "i"}
    if inicio or fim:
        rng = {}
        if inicio: rng["$gte"] = inicio
        if fim: rng["$lte"] = fim
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
    ]))

    ids = [c["_id"] for c in convs]
    titulos = {}
    if ids:
        titulos = {c["conversationId"]: c.get("title")
                for c in db.conversations.find(
                    {"conversationId": {"$in": ids}},
                    {"conversationId": 1, "title": 1})}
        titulos.update({
            (c.get("originalConversationId") or c.get("conversationId")): c.get("title")
            for c in db.conversationhistories.find(
                {"$or": [
                    {"conversationId": {"$in": ids}},
                    {"originalConversationId": {"$in": ids}}
                ]},
                {"conversationId": 1, "originalConversationId": 1, "title": 1})
        })

    for c in convs:
        c["conversationId"] = c["_id"]
        c["title"] = titulos.get(c["_id"]) or "(sem título)"

    history_convs = []
    if uid or texto:
        history_convs = _history_conversations(uid, inicio, fim, texto)

    merged = []
    seen = set(ids)

    merged.extend(convs)
    for h in history_convs:
        if h["conversationId"] in seen:
            continue
        merged.append(h)
        seen.add(h["conversationId"])

    merged.sort(key=lambda x: x.get("ultima") or x.get("primeira") or x.get("createdAt"), reverse=True)

    return {
        "usuario": {
            "nome": user.get("name") if user else "Busca por texto",
            "username": username or "",
            "email": user.get("email") if user else "",
            "_id": uid or "",
        },
        "conversas": _clean(merged),
    }


def buscar_mensagens(conversation_id, inicio=None, fim=None, texto=None):
    db = get_db()
    match = {"conversationId": conversation_id}
    if inicio or fim:
        rng = {}
        if inicio: rng["$gte"] = inicio
        if fim:    rng["$lte"] = fim
        match["createdAt"] = rng
    # NÃO filtra por texto aqui - retorna todas as mensagens
    # (texto será usado apenas para destacar, não para filtrar)

    msgs = list(db.messages.find(match).sort("createdAt", 1))
    if msgs:
        # Faz lookup com tabela de usuários para pegar username
        msgs = list(db.messages.aggregate([
            {"$match": match},
            {"$sort": {"createdAt": 1}},
            {"$lookup": {
                "from": "users",
                "let": {"user_str": "$user"},
                "pipeline": [
                    {"$match": {"$expr": {
                        "$eq": [{"$toString": "$_id"}, "$$user_str"]
                    }}}
                ],
                "as": "user_info"
            }},
            {"$unwind": {"path": "$user_info", "preserveNullAndEmptyArrays": True}}
        ]))
        return _clean([_parse_msg(m, texto) for m in msgs])

    history_filter = {
        "$or": [
            {"conversationId": conversation_id},
            {"originalConversationId": conversation_id},
        ]
    }
    history = db.conversationhistories.find_one(history_filter)
    if history:
        records = history.get("fullMessages") or []
        # Retorna TODAS as mensagens, não filtra por texto
        return _clean([_parse_msg(m, texto) for m in records])

    return _clean([])


def _parse_msg(m, texto_busca=None):
    """Separa texto final / thinking / tool. Cobre formato string (antigo)
    e formato content=array (novo). Também marca se contém o termo buscado."""
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

    # Verifica se a mensagem contém o termo de busca
    contem_termo = False
    if texto_busca:
        pattern = re.compile(re.escape(texto_busca), re.IGNORECASE)
        texto_completo = m.get("text", "") or ""
        if isinstance(content, list):
            for parte in content:
                if isinstance(parte, dict) and parte.get("type") == "text":
                    texto_completo += " " + (parte.get("text", "") or "")
        contem_termo = bool(pattern.search(texto_completo))

    # Extrai username de várias fontes possíveis
    username = None
    
    # 1. Tenta do user_info (vem do lookup com tabela de usuários)
    user_info = m.get("user_info")
    if isinstance(user_info, dict) and user_info:
        username = user_info.get("username")
    
    # 2. Se não encontrou, tenta do sender
    if not username:
        sender_info = m.get("sender")
        if isinstance(sender_info, dict):
            username = sender_info.get("username") or sender_info.get("name")
        elif isinstance(sender_info, str) and sender_info != "User":
            username = sender_info
    
    # 3. Se for mensagem de usuário e ainda não tem username, tenta extrair do user field
    if not username and m.get("isCreatedByUser"):
        user_id = m.get("user")
        if isinstance(user_id, str) and user_id:
            # Se tiver user_id como string, usa como fallback
            username = f"user_{user_id[-8:]}" if len(user_id) > 8 else user_id

    return {
        "messageId": m.get("messageId"),
        "isUser": m.get("isCreatedByUser", False),
        "sender": m.get("sender"),
        "username": username,  # username do usuário
        "model": m.get("model"),
        "createdAt": m.get("createdAt"),
        "contem_termo": contem_termo,  # marca se contém o termo buscado
        "blocos": blocos,
    }