// Modified by the lenerdz/zmk-studio fork: call_rpc_strict is new (the light colors
// need to tell "the firmware has no such request" from an empty answer).
import {
  call_rpc as inner_call_rpc,
  Request,
  RequestResponse,
  RpcConnection,
} from "@zmkfirmware/zmk-studio-ts-client";

export async function call_rpc(
  conn: RpcConnection,
  req: Omit<Request, "requestId">
): Promise<RequestResponse> {
  console.log("RPC Request", req);
  return inner_call_rpc(conn, req)
    .then((r) => {
      console.log("RPC Response", r);
      return r;
    })
    .catch((e) => {
      console.error("RPC Error", e);
      return e;
    });
}

/**
 * Same as call_rpc, but a failed request throws instead of being returned in
 * place of the response (a MetaError carries the error condition, such as
 * RPC_NOT_FOUND for a request the firmware does not know).
 */
export async function call_rpc_strict(
  conn: RpcConnection,
  req: Omit<Request, "requestId">
): Promise<RequestResponse> {
  console.log("RPC Request", req);
  try {
    const response = await inner_call_rpc(conn, req);
    console.log("RPC Response", response);
    return response;
  } catch (e) {
    // Logged as information: the caller decides what the failure means (a
    // keyboard without the light maps answers "RPC not found" to the first one).
    console.log("RPC Error", e);
    throw e;
  }
}
