const express = require("express");
const passport = require("passport");
const router = express.Router();

const ProjectObject = require("../models/project");

const SERVER_ERROR = "SERVER_ERROR";
const PROJECT_ALREADY_EXISTS = "PROJECT_ALREADY_EXISTS";

const ActivityObject = require("../models/activity");
const UserObject = require("../models/user");
const nodemailer = require("nodemailer");

router.post("/:id/send-report", passport.authenticate("user", { session: false }), async (req, res) => {
  try {
    const projectId = req.params.id;
    const project = await ProjectObject.findById(projectId);
    if (!project) return res.status(404).send({ ok: false, code: "PROJECT_NOT_FOUND" });

    const date = new Date();
    date.setDate(date.getDate() - 30);
    const activities = await ActivityObject.find({ projectId: projectId, date: { $gte: date } });

    const totalHours = activities.reduce((acc, a) => acc + a.total, 0);
    const totalBudget = activities.reduce((acc, a) => acc + a.value, 0);

    const userHoursMap = {};
    for (const act of activities) {
      if (!userHoursMap[act.userId]) {
        userHoursMap[act.userId] = 0;
      }
      userHoursMap[act.userId] += act.total;
    }

    const userIds = Object.keys(userHoursMap);
    const users = await UserObject.find({ _id: { $in: userIds } });

    const userHoursList = users.map((user) => {
      return `<li>${user.name}: ${userHoursMap[user._id]} hrs</li>`;
    });

    const html = `
      <h2>Project Report: ${project.name}</h2>
      <p><strong>Total Hours Worked:</strong> ${totalHours.toFixed(2)} hrs</p>
      <p><strong>Total Budget Consumed:</strong> €${totalBudget.toFixed(2)}</p>
      <h3>Who Worked:</h3>
      <ul>
        ${userHoursList.join("")}
      </ul>
    `;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "alesiah2025@gmail.com",
        pass: "gdic izgf ktoe mlwf",
      },
    });

    const recipient = "hajrullaalesia@gmail.com";

    await transporter.sendMail({
      from: '"Your Platform" <alesiah2025@gmail.com>',
      to: recipient,
      subject: `Report for Project: ${project.name}`,
      html,
    });

    return res.status(200).send({ ok: true, message: "Report sent successfully!" });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ ok: false, code: SERVER_ERROR, error });
  }
});

router.get("/list", passport.authenticate("user", { session: false }), async (req, res) => {
  try {
    const data = await ProjectObject.find({ ...req.query, organisation: req.user.organisation }).sort("-last_updated_at");
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    console.log(error);
    res.status(500).send({ ok: false, code: SERVER_ERROR, error });
  }
});

router.get("/:id", passport.authenticate("user", { session: false }), async (req, res) => {
  try {
    const data = await ProjectObject.findOne({ _id: req.params.id });
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    console.log(error);
    res.status(500).send({ ok: false, code: SERVER_ERROR, error });
  }
});

router.post("/", passport.authenticate("user", { session: false }), async (req, res) => {
  try {
    const data = await ProjectObject.create({ ...req.body, organisation: req.user.organisation });
    return res.status(200).send({ data, ok: true });
  } catch (error) {
    if (error.code === 11000) return res.status(409).send({ ok: false, code: PROJECT_ALREADY_EXISTS });
    console.log(error);
    return res.status(500).send({ ok: false, code: SERVER_ERROR });
  }
});

router.get("/", passport.authenticate("user", { session: false }), async (req, res) => {
  try {
    const data = await ProjectObject.find({ ...req.query, organisation: req.user.organisation }).sort("-last_updated_at");
    return res.status(200).send({ ok: true, data });
  } catch (error) {
    console.log(error);
    res.status(500).send({ ok: false, code: SERVER_ERROR, error });
  }
});

router.post("/search", passport.authenticate("user", { session: false }), async (req, res) => {
  try {
    const { name, status } = req.body;
    const query = {
      organisation: req.user.organisation,
    };

    if (status) query.status = status;
    if (name) query.name = { $regex: name, $options: "i" };

    const projects = await ProjectObject.find(query).sort("-last_updated_at");
    return res.status(200).send({ ok: true, data: projects });
  } catch (error) {
    console.log(error);
    res.status(500).send({ ok: false, code: SERVER_ERROR, error });
  }
});

router.put("/:id", passport.authenticate("user", { session: false }), async (req, res) => {
  try {
    const obj = req.body;

    const data = await ProjectObject.findByIdAndUpdate(req.params.id, obj, { new: true });

    res.status(200).send({ ok: true, data });
  } catch (error) {
    console.log(error);
    res.status(500).send({ ok: false, code: SERVER_ERROR, error });
  }
});

router.delete("/:id", passport.authenticate("user", { session: false }), async (req, res) => {
  try {
    await ProjectObject.findOneAndRemove({ _id: req.params.id });
    res.status(200).send({ ok: true });
  } catch (error) {
    console.log(error);
    res.status(500).send({ ok: false, code: SERVER_ERROR, error });
  }
});

module.exports = router;
