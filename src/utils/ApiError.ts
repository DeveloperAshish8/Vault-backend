// generalisation for errors

class ApiError extends Error {
  statusCode: number;
  data: any;
  message: any;
  errors: any[];
  success: boolean;

  constructor(
    statusCode: number,
    message = "Something Went Wrong",
    errors = [],
    stack = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.success = false;
    this.errors = errors;

    if (stack) this.stack = stack;
    else {
      if ((Error as any).captureStackTrace === "function") {
        (Error as any).captureStackTrace(this, this.constructor);
      }
    }
  }
}

export { ApiError };
