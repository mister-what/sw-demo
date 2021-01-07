const path = require("path");
const {
  readFileSync,
  promises: { readFile },
} = require("fs");
const fastify = require("fastify")({
  logger: {
    prettyPrint: true,
  },
  https: {
    key: readFileSync(path.resolve(__dirname, "../localhost.key")),
    cert: readFileSync(path.resolve(__dirname, "../localhost.crt")),
  },
});
const defaultQuotations = [
  {
    text:
      "Humanity is smart. Sometime in the technology world we think we " +
      "are smarter, but we are not smarter than you.",
    author: "Mitchell Baker",
  },
  {
    text:
      "A computer would deserve to be called intelligent if it could " +
      "deceive a human into believing that it was human.",
    author: "Alan Turing",
  },
  {
    text: "If you optimize everything, you will always be unhappy.",
    author: "Donald Knuth",
  },
  {
    text:
      "If you don't fail at least 90 percent of the time, you're not " +
      "aiming high enough",
    author: "Alan Kay",
  },
  {
    text: "Colorless green ideas sleep furiously.",
    author: "Noam Chomsky",
  },
].map((item, idx) => ({ ...item, id: idx + 1, isSticky: true }));

const querystring = {
  type: "object",
  properties: {
    session: {
      type: "string",
    },
  },
  required: ["session"],
};

const updateMap = (key, updateFn, map) => {
  const data = map.get(key);
  map.set(key, updateFn(data));
  return map;
};

const initSession = (sessionId, sessions) => {
  if (!sessions.has(sessionId)) {
    defaultQuotations;
    sessions.set(sessionId, defaultQuotations);
  }
  return sessions;
};

fastify.register(
  async (app) => {
    const sessions = new Map();
    app.get(
      "/quotations",
      {
        schema: {
          querystring,
        },
      },
      (request, reply) => {
        if (sessions.has(request.query.session)) {
          return reply.send(sessions.get(request.query.session));
        }
        return reply.send(defaultQuotations);
      }
    );
    app.delete(
      "/quotations/:id",
      {
        schema: {
          params: {
            type: "object",
            properties: {
              id: {
                type: "number",
              },
            },
            required: ["id"],
          },
          querystring,
        },
      },
      (request, reply) => {
        updateMap(
          request.query.session,
          (items) => items.filter(({ id }) => request.params.id !== id),
          initSession(request.query.session, sessions)
        );
        return reply.status(204).send();
      }
    );
    app.post(
      "/quotations",
      {
        schema: {
          querystring,
          body: {
            type: "object",
            properties: {
              text: {
                type: "string",
              },
              author: {
                type: "string",
              },
              sticky: {
                type: "boolean",
                default: false,
              },
            },
            required: ["text", "author"],
            additionalProperties: false,
          },
        },
      },
      (request, reply) => {
        const quotes = new Map(
          initSession(request.query.session, sessions)
            .get(request.query.session)
            .map((item) => [item.id, item])
        );
        const quote = { ...request.body, id: quotes.size + 1 };
        quotes.set(quotes.size + 1, quote);
        sessions.set(request.query.session, Array.from(quotes.values()));
        reply.status(201).send(quote);
      }
    );
  },
  {
    prefix: "/api",
  }
);

fastify.register(require("fastify-static"), {
  root: path.resolve(__dirname, "../public"),
  list: true,
  send: {
    index: true,
  },
});
const indexFile = path.resolve(__dirname, "../public/index.html");
fastify.get("/", {}, (request, reply) => {
  return readFile(indexFile, "utf8").then((file) =>
    reply.header("content-type", "text/html; charset=utf-8").send(file)
  );
});

fastify.listen(3000, () => {
  console.log(`Open: https://localhost:3000/`);
});
