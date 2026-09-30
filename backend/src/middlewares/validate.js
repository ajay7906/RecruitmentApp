// validate(schema) -> schema is z.object({ body?, query?, params? })
module.exports = (schema) => (req, _res, next) => {
  const parsed = schema.parse({ body: req.body, query: req.query, params: req.params });
  if (parsed.body) req.body = parsed.body;
  next();
};
