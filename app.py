from flask import Flask, render_template, request, jsonify
from datetime import datetime, timedelta
from queries import (resumo_geral, ranking_gastos, buscar_usuarios,
                    listar_conversas, buscar_mensagens)
from actions import adicionar_creditos, remover_creditos, alterar_role
from flask.json.provider import DefaultJSONProvider
from bson import ObjectId

class MongoJSONProvider(DefaultJSONProvider):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

app = Flask(__name__)
app.json = MongoJSONProvider(app)

def _parse_data(s):
    """Aceita '2026-01-01' ou '2026-01-01T23:59:59'."""
    if not s:
        return None
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        return None

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/resumo")
def api_resumo():
    return jsonify(resumo_geral())

@app.route("/api/ranking")
def api_ranking():
    dias = int(request.args.get("dias", 30))
    fim = datetime.now()
    inicio = fim - timedelta(days=dias)
    return jsonify(ranking_gastos(inicio, fim))

@app.route("/api/buscar")
def api_buscar():
    termo = request.args.get("q", "").strip()
    if len(termo) < 2:
        return jsonify([])
    return jsonify(buscar_usuarios(termo))

@app.route("/api/acao", methods=["POST"])
def api_acao():
    d = request.json
    try:
        if d["tipo"] == "add_creditos":
            adicionar_creditos(d["user_id"], int(d["valor"]))
        elif d["tipo"] == "rem_creditos":
            remover_creditos(d["user_id"], int(d["valor"]))
        elif d["tipo"] == "alterar_role":
            alterar_role(d["user_id"], d["valor"])
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "erro": str(e)}), 400

# ============================================================
# 💬 NOVO: ROTAS DE CONVERSAS
# ============================================================

@app.route("/api/conversas")
def api_conversas():
    username = request.args.get("username", "").strip()
    if not username:
        return jsonify({"erro": "informe a matrícula"}), 400
    return jsonify(listar_conversas(
        username,
        _parse_data(request.args.get("inicio")),
        _parse_data(request.args.get("fim")),
    ))

@app.route("/api/mensagens")
def api_mensagens():
    conv = request.args.get("conv", "").strip()
    if not conv:
        return jsonify([])
    return jsonify(buscar_mensagens(
        conv,
        _parse_data(request.args.get("inicio")),
        _parse_data(request.args.get("fim")),
        request.args.get("texto") or None,
    ))

if __name__ == "__main__":
    app.run(debug=True, port=5000)