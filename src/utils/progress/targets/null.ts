import type { ExtractedError, ProgressTarget, Status } from "../index";

/**
 * Null target - no-op implementation for tests
 */
export class NullTarget implements ProgressTarget {
  agent(_name: string, _status: Status, _message?: string): void {}
  tool(_name: string, _status: Status, _result?: string): void {}
  message(_text: string): void {}
  error(_error: ExtractedError): void {}
}
