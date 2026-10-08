export class DesignomeError extends Error {
  constructor(
    message,
    { code = 'DESIGNOME_ERROR', details = [], exitCode = 1 } = {},
  ) {
    super(message);
    this.name = 'DesignomeError';
    this.code = code;
    this.details = details;
    this.exitCode = exitCode;
  }
}
