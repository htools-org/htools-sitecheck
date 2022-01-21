const express = require("express");
const cors = require("cors");

const { Validator } = require("./lib");

const app = express();
const port = process.env.PORT ?? 3001;

app.use(cors());

app.get("/", (req, res) => {
  res.send("HTools SiteCheck API");
});

app.get("/check/:domain", async (req, res) => {
  const domain = req.params.domain;

  if (!domain || !/[\w-.]+/gim.test(domain)) {
    return res.status(400).send({ error: "Bad domain." });
  }

  try {
    console.log("Creating Validator for", domain);
    const validator = new Validator(domain);
    const result = await validator.validate();
    // console.log(JSON.stringify(result));
    return res.send(result);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server listening at port ${port}`);
});
