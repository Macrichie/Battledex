require("dotenv").config();
const express = require("express");
const { fight } = require("./fight");

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

app.post("/api/fight", async (req, res) => {
  const { fighter1, fighter2 } = req.body;
  if (!fighter1 || !fighter2) {
    return res.status(400).json({ invalid: true, reasoning: "Two fighter names are required." });
  }
  try {
    const result = await fight(fighter1, fighter2);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ invalid: true, reasoning: "Fight simulation failed. Try again." });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Battleground running at http://localhost:${PORT}`));
