import { defineEnvVars } from '@sveltejs/kit/env';
import { frappeApiVariables } from './lib/server/config/frappe-api.env';
import { sessionVariables } from './lib/server/config/session.env';

// OPS-01: every variable is declared once here, read at runtime (`static: false`, the default)
// through `$app/env/private`. Relative imports: Kit loads this file outside the app's Vite config.
export const variables = defineEnvVars({
	...frappeApiVariables,
	...sessionVariables
});
