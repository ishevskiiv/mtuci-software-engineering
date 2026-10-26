import { useState, useEffect } from 'react'
import axios from 'axios'

const API = 'http://localhost:8000'

function App() {
  // какая страница сейчас открыта: list, form, student
  const [page, setPage] = useState('list')
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState('')

  // для формы
  const [editId, setEditId] = useState(null)
  const [name, setName] = useState('')
  const [groupName, setGroupName] = useState('')
  const [error, setError] = useState('')

  // для страницы студента
  const [student, setStudent] = useState(null)
  const [grades, setGrades] = useState([])
  const [average, setAverage] = useState(0)
  const [subject, setSubject] = useState('')
  const [grade, setGrade] = useState(5)
  const [gradeDate, setGradeDate] = useState('')
  const [editGradeId, setEditGradeId] = useState(null)

  useEffect(() => {
    loadStudents()
  }, [])

  function loadStudents() {
    axios.get(API + '/students', { params: { search: search, group: group, limit: 100 } })
      .then(res => setStudents(res.data))
      .catch(() => alert('Не удалось загрузить студентов, сервер запущен?'))
  }

  function openAdd() {
    setEditId(null)
    setName('')
    setGroupName('')
    setError('')
    setPage('form')
  }

  function openEdit(s) {
    setEditId(s.id)
    setName(s.name)
    setGroupName(s.group_name)
    setError('')
    setPage('form')
  }

  function saveStudent(e) {
    e.preventDefault()
    const data = { name: name, group_name: groupName }
    let request
    if (editId === null) {
      request = axios.post(API + '/students', data)
    } else {
      request = axios.put(API + '/students/' + editId, data)
    }
    request
      .then(() => {
        loadStudents()
        setPage('list')
      })
      .catch(() => setError('Ошибка! Проверьте что поля заполнены (минимум 2 символа)'))
  }

  function deleteStudent(id) {
    if (!window.confirm('Точно удалить студента?')) return
    axios.delete(API + '/students/' + id).then(() => loadStudents())
  }

  function today() {
    return new Date().toISOString().slice(0, 10)
  }

  function openStudent(s) {
    setStudent(s)
    setSubject('')
    setGrade(5)
    setGradeDate(today())
    setEditGradeId(null)
    loadGrades(s.id)
    setPage('student')
  }

  function loadGrades(id) {
    axios.get(API + '/students/' + id + '/grades').then(res => setGrades(res.data))
    axios.get(API + '/students/' + id + '/average').then(res => setAverage(res.data.average))
  }

  function saveGrade(e) {
    e.preventDefault()
    const data = { student_id: student.id, subject: subject, grade: Number(grade), date: gradeDate }
    let request
    if (editGradeId === null) {
      request = axios.post(API + '/grades', data)
    } else {
      request = axios.put(API + '/grades/' + editGradeId, data)
    }
    request
      .then(() => {
        setSubject('')
        setGrade(5)
        setGradeDate(today())
        setEditGradeId(null)
        loadGrades(student.id)
      })
      .catch(() => alert('Ошибка! Проверьте предмет и дату'))
  }

  function editGrade(g) {
    setEditGradeId(g.id)
    setSubject(g.subject)
    setGrade(g.grade)
    setGradeDate(g.date)
  }

  function deleteGrade(id) {
    axios.delete(API + '/grades/' + id).then(() => loadGrades(student.id))
  }

  return (
    <div className="container mt-4">
      <h1 className="mb-4">Студенческий журнал</h1>

      {page === 'list' && (
        <div>
          <div className="row mb-3">
            <div className="col-md-5">
              <input className="form-control" placeholder="Поиск по ФИО"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="col-md-3">
              <select className="form-select" value={group} onChange={e => setGroup(e.target.value)}>
                <option value="">Все группы</option>
                <option value="БСТ2556">БСТ2556</option>
                <option value="БСТ2557">БСТ2557</option>
                <option value="БСТ2558">БСТ2558</option>
              </select>
            </div>
            <div className="col-md-4">
              <button className="btn btn-secondary me-2" onClick={loadStudents}>Найти</button>
              <button className="btn btn-success" onClick={openAdd}>Добавить студента</button>
            </div>
          </div>

          <table className="table table-bordered table-hover">
            <thead className="table-light">
              <tr>
                <th>ID</th>
                <th>ФИО</th>
                <th>Группа</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id}>
                  <td>{s.id}</td>
                  <td>{s.name}</td>
                  <td>{s.group_name}</td>
                  <td>
                    <button className="btn btn-sm btn-primary me-2" onClick={() => openStudent(s)}>Оценки</button>
                    <button className="btn btn-sm btn-warning me-2" onClick={() => openEdit(s)}>Изменить</button>
                    <button className="btn btn-sm btn-danger" onClick={() => deleteStudent(s.id)}>Удалить</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {students.length === 0 && <p>Студентов не найдено</p>}
        </div>
      )}

      {page === 'form' && (
        <div style={{ maxWidth: 500 }}>
          <h3>{editId === null ? 'Новый студент' : 'Редактирование студента'}</h3>
          <form onSubmit={saveStudent}>
            <div className="mb-3">
              <label className="form-label">ФИО</label>
              <input className="form-control" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="form-label">Группа</label>
              <input className="form-control" value={groupName} onChange={e => setGroupName(e.target.value)} />
            </div>
            {error !== '' && <div className="alert alert-danger">{error}</div>}
            <button type="submit" className="btn btn-success me-2">Сохранить</button>
            <button type="button" className="btn btn-secondary" onClick={() => setPage('list')}>Назад</button>
          </form>
        </div>
      )}

      {page === 'student' && student !== null && (
        <div>
          <button className="btn btn-secondary mb-3" onClick={() => setPage('list')}>Назад к списку</button>
          <h3>{student.name}</h3>
          <p>Группа: {student.group_name}</p>
          <p><b>Средний балл: {average}</b></p>

          <form className="row mb-3" onSubmit={saveGrade}>
            <div className="col-md-4">
              <input className="form-control" placeholder="Предмет"
                value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
            <div className="col-md-2">
              <select className="form-select" value={grade} onChange={e => setGrade(e.target.value)}>
                <option value="5">5</option>
                <option value="4">4</option>
                <option value="3">3</option>
                <option value="2">2</option>
              </select>
            </div>
            <div className="col-md-3">
              <input type="date" className="form-control" value={gradeDate} onChange={e => setGradeDate(e.target.value)} />
            </div>
            <div className="col-md-3">
              <button type="submit" className="btn btn-success">
                {editGradeId === null ? 'Поставить оценку' : 'Сохранить оценку'}
              </button>
            </div>
          </form>

          <table className="table table-bordered">
            <thead className="table-light">
              <tr>
                <th>Предмет</th>
                <th>Оценка</th>
                <th>Дата</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {grades.map(g => (
                <tr key={g.id}>
                  <td>{g.subject}</td>
                  <td>{g.grade}</td>
                  <td>{g.date}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-warning me-2" onClick={() => editGrade(g)}>Изменить</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => deleteGrade(g.id)}>Удалить</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default App
