import sqlite3
from datetime import date
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="API студенческого журнала")

# чтобы react мог обращаться к api
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB = "journal.db"


def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn


def create_tables():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            group_name TEXT NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS grades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            subject TEXT NOT NULL,
            grade INTEGER NOT NULL,
            date TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


create_tables()


# модели
class Student(BaseModel):
    name: str = Field(min_length=2)
    group_name: str = Field(min_length=2)


class Grade(BaseModel):
    student_id: int
    subject: str = Field(min_length=2)
    grade: int = Field(ge=2, le=5)  # оценка от 2 до 5
    date: date


# ---------------- студенты ----------------

@app.get("/students")
def get_students(search: str = "", group: str = "", sort: str = "name", page: int = 1, limit: int = 10):
    if sort not in ["name", "group_name", "id"]:
        raise HTTPException(400, "Неправильное поле для сортировки")
    if page < 1:
        page = 1
    if limit < 1:
        limit = 10
    conn = get_db()
    sql = "SELECT * FROM students WHERE name LIKE ?"
    params = ["%" + search + "%"]
    if group != "":
        sql += " AND group_name = ?"
        params.append(group)
    sql += " ORDER BY " + sort + " LIMIT ? OFFSET ?"
    params.append(limit)
    params.append((page - 1) * limit)
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/students/{student_id}")
def get_student(student_id: int):
    conn = get_db()
    row = conn.execute("SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()
    conn.close()
    if row is None:
        raise HTTPException(404, "Студент не найден")
    return dict(row)


@app.post("/students")
def add_student(student: Student):
    conn = get_db()
    cur = conn.execute("INSERT INTO students (name, group_name) VALUES (?, ?)", (student.name, student.group_name))
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return {"id": new_id, "name": student.name, "group_name": student.group_name}


@app.put("/students/{student_id}")
def update_student(student_id: int, student: Student):
    conn = get_db()
    cur = conn.execute("UPDATE students SET name = ?, group_name = ? WHERE id = ?",
                       (student.name, student.group_name, student_id))
    conn.commit()
    conn.close()
    if cur.rowcount == 0:
        raise HTTPException(404, "Студент не найден")
    return {"id": student_id, "name": student.name, "group_name": student.group_name}


@app.delete("/students/{student_id}")
def delete_student(student_id: int):
    conn = get_db()
    cur = conn.execute("DELETE FROM students WHERE id = ?", (student_id,))
    conn.execute("DELETE FROM grades WHERE student_id = ?", (student_id,))
    conn.commit()
    conn.close()
    if cur.rowcount == 0:
        raise HTTPException(404, "Студент не найден")
    return {"message": "Студент удален"}


# ---------------- оценки ----------------

@app.get("/students/{student_id}/grades")
def get_student_grades(student_id: int):
    conn = get_db()
    rows = conn.execute("SELECT * FROM grades WHERE student_id = ? ORDER BY date", (student_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/students/{student_id}/average")
def get_average(student_id: int):
    conn = get_db()
    row = conn.execute("SELECT AVG(grade) AS avg, COUNT(*) AS cnt FROM grades WHERE student_id = ?",
                       (student_id,)).fetchone()
    conn.close()
    if row["cnt"] == 0:
        return {"student_id": student_id, "average": 0, "count": 0}
    return {"student_id": student_id, "average": round(row["avg"], 2), "count": row["cnt"]}


@app.get("/grades")
def get_grades(subject: str = ""):
    conn = get_db()
    if subject == "":
        rows = conn.execute("SELECT * FROM grades").fetchall()
    else:
        rows = conn.execute("SELECT * FROM grades WHERE subject = ?", (subject,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/grades")
def add_grade(grade: Grade):
    conn = get_db()
    student = conn.execute("SELECT * FROM students WHERE id = ?", (grade.student_id,)).fetchone()
    if student is None:
        conn.close()
        raise HTTPException(404, "Такого студента нет")
    if grade.date > date.today():
        conn.close()
        raise HTTPException(400, "Дата не может быть в будущем")
    cur = conn.execute("INSERT INTO grades (student_id, subject, grade, date) VALUES (?, ?, ?, ?)",
                       (grade.student_id, grade.subject, grade.grade, str(grade.date)))
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return {"id": new_id, "student_id": grade.student_id, "subject": grade.subject, "grade": grade.grade,
            "date": str(grade.date)}


@app.put("/grades/{grade_id}")
def update_grade(grade_id: int, grade: Grade):
    if grade.date > date.today():
        raise HTTPException(400, "Дата не может быть в будущем")
    conn = get_db()
    student = conn.execute("SELECT * FROM students WHERE id = ?", (grade.student_id,)).fetchone()
    if student is None:
        conn.close()
        raise HTTPException(404, "Такого студента нет")
    cur = conn.execute("UPDATE grades SET student_id = ?, subject = ?, grade = ?, date = ? WHERE id = ?",
                       (grade.student_id, grade.subject, grade.grade, str(grade.date), grade_id))
    conn.commit()
    conn.close()
    if cur.rowcount == 0:
        raise HTTPException(404, "Оценка не найдена")
    return {"id": grade_id, "student_id": grade.student_id, "subject": grade.subject, "grade": grade.grade,
            "date": str(grade.date)}


@app.delete("/grades/{grade_id}")
def delete_grade(grade_id: int):
    conn = get_db()
    cur = conn.execute("DELETE FROM grades WHERE id = ?", (grade_id,))
    conn.commit()
    conn.close()
    if cur.rowcount == 0:
        raise HTTPException(404, "Оценка не найдена")
    return {"message": "Оценка удалена"}
