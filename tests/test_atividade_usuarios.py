import unittest
from datetime import datetime
from unittest.mock import patch
from bson import ObjectId

import queries


class FakeMessages:
    def __init__(self):
        self.calls = 0

    def aggregate(self, pipeline):
        self.calls += 1
        if self.calls == 1:
            return [{"_id": "2024-01-01", "mensagens": 12}]
        if self.calls == 2:
            return [{"_id": "2024-01-01", "usuarios_acima_10": 1}]
        return [{
            "_id": ObjectId("507f1f77bcf86cd799439011"),
            "dias_acima": 1,
            "max_mensagens_dia": 12,
            "total_mensagens": 12,
            "dias": ["2024-01-01"],
            "nome": "Ana",
            "email": "ana@example.com",
            "username": "ana",
        }]


class FakeDB:
    def __init__(self):
        self.messages = FakeMessages()


class AtividadeUsuariosTests(unittest.TestCase):
    def test_atividade_usuarios_gera_series_e_lista(self):
        fake_db = FakeDB()

        with patch.object(queries, "get_db", return_value=fake_db):
            result = queries.atividade_usuarios(
                datetime(2024, 1, 1),
                datetime(2024, 1, 1),
            )

        self.assertEqual(result["total_mensagens"], 12)
        self.assertEqual(result["total_usuarios_acima_10"], 1)
        self.assertEqual(result["media_usuarios_acima_10"], 1)
        self.assertEqual(result["dias"][0]["dia"], "2024-01-01")
        self.assertEqual(result["usuarios_acima_10"][0]["username"], "ana")


if __name__ == "__main__":
    unittest.main()
