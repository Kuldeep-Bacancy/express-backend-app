// require('dotenv').config({ path: './env' })

import dotenv from 'dotenv'
import connectDB from "./db/connect.js";
import app from './app.js';

dotenv.config({
  path: './env'
})

connectDB()
.then(() => {
  const port = process.env.PORT || 3000
  app.listen(port, () => {
    console.log("Server running on", port);
  })

  app.get('/', (req, res) => {
    res.send("Welcome to The APP!")
  })
})
.catch((err) => {
  console.log("DB connection failed!", err);
})