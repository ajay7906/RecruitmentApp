import sys
from pathlib import Path

LLM_ROOT = Path(__file__).resolve().parents[1]
if str(LLM_ROOT) not in sys.path:
    sys.path.insert(0, str(LLM_ROOT))

import app.core.pgvector_patch
from pgvector.vector import Vector
from pgvector.sqlalchemy import VECTOR
from sqlalchemy.dialects.postgresql import dialect


def test_vector_from_db_with_python_list():
    sample_list = [0.123, -0.456, 0.789, 0.0]
    result = Vector._from_db(sample_list)
    assert isinstance(result, list)
    assert result == sample_list


def test_vector_from_db_with_python_tuple():
    sample_tuple = (0.5, 0.25, 0.125)
    result = Vector._from_db(sample_tuple)
    assert isinstance(result, list)
    assert result == [0.5, 0.25, 0.125]


def test_vector_from_db_with_text():
    sample_text = "[0.1,0.2,0.3]"
    result = Vector._from_db(sample_text)
    assert isinstance(result, list)
    assert result == [0.1, 0.2, 0.3]


def test_vector_from_db_with_vector_instance():
    v = Vector([0.1, 0.2, 0.3])
    result = Vector._from_db(v)
    assert isinstance(result, list)
    assert len(result) == 3
    assert round(result[0], 2) == 0.1


def test_vector_from_db_with_none():
    assert Vector._from_db(None) is None


def test_sqlalchemy_vector_result_processor():
    col = VECTOR(768)
    proc = col.result_processor(dialect(), None)

    # When driver returns a list
    list_res = proc([0.05] * 768)
    assert isinstance(list_res, list)
    assert len(list_res) == 768

    # When driver returns string
    str_res = proc("[0.1,0.2]")
    assert str_res == [0.1, 0.2]

    # When driver returns None
    assert proc(None) is None
