// Not part of the defect: eve prepares a sandbox at every build, and just-bash needs no extra service.
import { defineSandbox } from "eve/sandbox";
import { JustBashSandbox } from "eve/sandbox/just-bash";

export const environment = JustBashSandbox.environment();
export default defineSandbox(() => environment.open());
