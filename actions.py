from db import get_db
from bson import ObjectId

def adicionar_creditos(user_id, quantidade):
    db = get_db()
    db.balances.update_one(
        {"user": ObjectId(user_id)},
        {"$inc": {"tokenCredits": quantidade}},
        upsert=True
    )

def remover_creditos(user_id, quantidade):
    adicionar_creditos(user_id, -quantidade)

def alterar_role(user_id, nova_role):  # "ADMIN" ou "USER"
    db = get_db()
    db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"role": nova_role}}
    )

