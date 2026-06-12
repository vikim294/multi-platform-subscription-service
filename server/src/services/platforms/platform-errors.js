export class PlatformRequestError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'PlatformRequestError';
    Object.assign(this, options);
  }
}

export class PlatformContractError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'PlatformContractError';
    this.contract = true;
    this.code = 'platform_contract_error';
    Object.assign(this, options);
  }
}
