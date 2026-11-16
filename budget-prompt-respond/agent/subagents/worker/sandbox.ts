import { defineSandbox } from "eve/sandbox";
import { JustBashSandbox } from "eve/sandbox/just-bash";

// No step uses a sandbox, but eve prepares one at each build. just-bash is the lightest.
export const environment = JustBashSandbox.environment();
export default defineSandbox(() => environment.open());
