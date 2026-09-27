import type { RequestHandler } from "express";
import type { ZodType } from "zod";

type Schemas = {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
};

// Validates request parts against Zod schemas and replaces them with parsed data.
// A ZodError thrown here is turned into a 400 by the central error handler.
export const validate =
  (schemas: Schemas): RequestHandler =>
  (req, _res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.params) Object.assign(req.params, schemas.params.parse(req.params));
      if (schemas.query) Object.assign(req.query, schemas.query.parse(req.query));
      next();
    } catch (err) {
      next(err);
    }
  };
