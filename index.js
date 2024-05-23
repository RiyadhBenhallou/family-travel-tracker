import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  connectionString: process.env['DB_URI'],
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 11;

let users = [];

const fetchUsers = async () => {
  const {rows: result} = await db.query('SELECT * FROM users')
  users = result;
}

async function checkVisited() {
  const result = await db.query("SELECT country_code FROM visited_countries WHERE user_id = $1", [currentUserId]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}



app.get("/", async (req, res) => {
  await fetchUsers()
  const countries = await checkVisited();
  const index = users.findIndex((user) => user.id == currentUserId);
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: users[index].color,
  });
});
app.post("/add", async (req, res) => {
  const input = req.body["country"];

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});
app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render('new.ejs')
  } else {
    const {user: userId} = req.body;
    currentUserId = userId
    res.redirect('/')
  }
  
});

app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
  const { name, color } = req.body;
  const {rows: user} = await db.query('INSERT INTO users (name, color) VALUES ($1, $2) RETURNING *', [name, color])
  currentUserId = user[0].id;
  res.redirect('/')
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
