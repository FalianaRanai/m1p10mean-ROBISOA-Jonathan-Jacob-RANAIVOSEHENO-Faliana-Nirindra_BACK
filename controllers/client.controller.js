const Clientdb = require("../models/client.model");
const Roledb = require("../models/role.model");
const Userdb = require("../models/user.model");
const controllerName = "client.controller";
const mongoose = require("mongoose");
const ObjectId = require("mongodb").ObjectId;
const sendErrorResponse = require("@utils/sendErrorResponse.util");
const sendSuccessResponse = require("@utils/sendSuccessResponse.util");
const verifyArgumentExistence = require("@utils/verifyArgumentExistence");
const bcrypt = require("bcrypt");
const UserTokendb = require("../models/userToken.model");
const writeFile = require("@utils/writeFile.util");
const deleteFile = require("@utils/deleteFile.util");

exports.getClient = (req, res) => {
  const functionName = "getClient";
  try {
    const { id } = req.params;
    verifyArgumentExistence(["id"], req.params);

    Clientdb.find({_id: id, isDeleted: false } )
      .populate({ path: "user", populate: { path: "role" } })
      .populate({
        path: "historiqueRDV",
        populate: [
          {
            path: "listeEmployes",
            populate: { path: "user", populate: { path: "role" } },
          },
          { path: "listeServices" },
          {
            path: "listeTaches",
            populate: [
              {
                path: "employe",
                populate: { path: "user", populate: { path: "role" } },
              },
              { path: "service" },
              { path: "statut" },
            ],
          },
        ],
      })
      .then((data) => {
        sendSuccessResponse(res, data ? data[0] : null, controllerName, functionName);
      })
      .catch((err) => {
        sendErrorResponse(res, err, controllerName, functionName);
      });
  } catch (err) {
    sendErrorResponse(res, err, controllerName, functionName);
  }
};

exports.getListeClient = (req, res) => {
  const functionName = "getListeClient";
  try {
    Clientdb.find({isDeleted: false})
      .populate({ path: "user", populate: { path: "role" } })
      .populate({
        path: "historiqueRDV",
        populate: [
          {
            path: "listeEmployes",
            populate: { path: "user", populate: { path: "role" } },
          },
          { path: "listeServices" },
          {
            path: "listeTaches",
            populate: [
              {
                path: "employe",
                populate: { path: "user", populate: { path: "role" } },
              },
              { path: "service" },
              { path: "statut" },
            ],
          },
        ],
      })
      .then((data) => {
        sendSuccessResponse(res, data, controllerName, functionName);
      })
      .catch((err) => {
        sendErrorResponse(res, err, controllerName, functionName);
      });
  } catch (err) {
    sendErrorResponse(res, err, controllerName, functionName);
  }
};

exports.addClient = async (req, res) => {
  const functionName = "addClient";
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { nomClient, prenomClient, email, password, confirmPassword } =
      req.body;

    verifyArgumentExistence(
      ["nomClient", "prenomClient", "email", "password", "confirmPassword"],
      req.body
    );

    if ((password && !confirmPassword) || (!password && confirmPassword)) {
      throw new Error("Veillez remplir les champs de mot de passe");
    }
    if (confirmPassword && confirmPassword !== password) {
      throw new Error("Les mots de passes ne correspondent pas");
    }

    let role = await Roledb.findOne({ nomRole: "Client" });
    if (!role) {
      await new Roledb({ nomRole: "Client" }).save();
      role = await Roledb.findOne({ nomRole: "Client" });
    }

    const newDataUser = {
      email: email,
      password: bcrypt.hashSync(password, 10),
      role: new ObjectId(role._id),
    };

    const dataUserToInsert = new Userdb(newDataUser);
    dataUserToInsert
      .save({ session })
      .then(async (newUser) => {
        let nomFichier = await writeFile(req, "Client");

        const newData = {
          nomClient: nomClient,
          prenomClient: prenomClient,
          user: new ObjectId(newUser._id),
          image: nomFichier ? nomFichier : undefined,
        };

        const dataToInsert = new Clientdb(newData);
        dataToInsert
          .save({ session })
          .then(async (data) => {
            sendSuccessResponse(
              res,
              data,
              controllerName,
              functionName,
              session
            );
          })
          .catch((err) => {
            sendErrorResponse(res, err, controllerName, functionName, session);
          });
      })
      .catch((err) => {
        sendErrorResponse(res, err, controllerName, functionName, session);
      });
  } catch (err) {
    sendErrorResponse(res, err, controllerName, functionName, session);
  }
};

exports.updateClient = async (req, res) => {
  const functionName = "updateClient";
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const { nomClient, prenomClient, user } = req.body;

    verifyArgumentExistence(["id"], req.params);
    verifyArgumentExistence(["nomClient", "prenomClient", "user"], req.body);

    let nomFichier = await writeFile(req, "Client");
    const newData = {
      nomClient: nomClient,
      prenomClient: prenomClient,
      user: new ObjectId(user),
      image: nomFichier ? nomFichier : undefined,
    };

    Clientdb.findByIdAndUpdate(new ObjectId(id), newData, {
      session,
    })
      .then(async (data) => {
        sendSuccessResponse(res, data, controllerName, functionName, session);
      })
      .catch(async (err) => {
        sendErrorResponse(res, err, controllerName, functionName, session);
      });
  } catch (err) {
    sendErrorResponse(res, err, controllerName, functionName, session);
  }
};

exports.deleteClient = async (req, res) => {
  const functionName = "deleteClient";
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    verifyArgumentExistence(["id"], req.params);

    Clientdb.findByIdAndUpdate(new ObjectId(id), { isDeleted: true }, { session })
      .then(async (data) => {
        sendSuccessResponse(res, data, controllerName, functionName, session);
      })
      .catch(async (err) => {
        sendErrorResponse(res, err, controllerName, functionName, session);
      });
  } catch (err) {
    sendErrorResponse(res, err, controllerName, functionName, session);
  }
};
