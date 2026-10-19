// Ported from @zmkfirmware/zmk-studio-ts-client 0.0.18 (lib/transport/errors.js),
// MIT License, Copyright (c) 2020 The ZMK Contributors. See LICENSE.
export class UserCancelledError extends Error {
  constructor(m: string, opts?: ErrorOptions) {
    super(m, opts);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, UserCancelledError.prototype);
  }
}
