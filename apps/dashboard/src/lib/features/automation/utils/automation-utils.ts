import type { AutomationKeyType } from './types';
import { env } from '$env/dynamic/public';

const PUBLIC_API_SETUP_SECRET_PLACEHOLDER = '<paste-your-api-key>';

const API_SERVER_URL = (env.PUBLIC_SERVER_URL || '').replace(/\/$/, '');
const PUBLIC_API_BASE_URL = `${API_SERVER_URL}/public-api/v1`;
/** Built from packages/mcp and served by the dashboard (see docker/Dockerfile.dashboard). */
const MCP_PACKAGE_URL = `${API_SERVER_URL}/mcp/mp-learning-mcp.tgz`;

export const MCP_DOCS_URL = '/help/automation/mcp';
export const PUBLIC_API_DOCS_URL = '/help/automation/api-keys';
export const WEBHOOKS_DOCS_URL = '/help/automation/webhooks';
export const WEBHOOKS_VERIFY_SIGNATURE_DOCS_URL = `${WEBHOOKS_DOCS_URL}#xac-thuc-chu-ky`;

function getServerPath() {
  return `npx -y ${MCP_PACKAGE_URL}`;
}

export function getPublicApiSetupSecret(secret: string | null) {
  return secret ?? PUBLIC_API_SETUP_SECRET_PLACEHOLDER;
}

export function getPublicApiCurlSnippet(secret: string | null) {
  const apiKey = getPublicApiSetupSecret(secret);

  return `curl ${PUBLIC_API_BASE_URL}/audience \\
  -H "Authorization: Bearer ${apiKey}"`;
}

export function getPublicApiJavaScriptSnippet(secret: string | null) {
  const apiKey = getPublicApiSetupSecret(secret);

  return `const response = await fetch('${PUBLIC_API_BASE_URL}/audience', {
  headers: {
    Authorization: 'Bearer ${apiKey}'
  }
});

const { data } = await response.json();
console.log(data);`;
}

export function getPublicApiPythonSnippet(secret: string | null) {
  const apiKey = getPublicApiSetupSecret(secret);

  return `import requests

response = requests.get(
    "${PUBLIC_API_BASE_URL}/audience",
    headers={"Authorization": f"Bearer ${apiKey}"},
)
response.raise_for_status()

data = response.json()["data"]
print(data)`;
}

export function getPublicApiGoSnippet(secret: string | null) {
  const apiKey = getPublicApiSetupSecret(secret);

  return `package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

func main() {
	req, err := http.NewRequest(http.MethodGet, "${PUBLIC_API_BASE_URL}/audience", nil)
	if err != nil {
		panic(err)
	}

	req.Header.Set("Authorization", "Bearer ${apiKey}")

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()

	body, err := io.ReadAll(res.Body)
	if err != nil {
		panic(err)
	}

	if res.StatusCode >= 400 {
		panic(fmt.Sprintf("request failed: %s", body))
	}

	var payload struct {
		Data json.RawMessage \`json:"data"\`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		panic(err)
	}

	fmt.Println(string(payload.Data))
}`;
}

export function getAutomationSetupSecret(secret: string | null) {
  return secret ?? '<paste-your-mcp-key>';
}

export function getClaudeCodeSnippet(secret: string | null) {
  const apiKey = getAutomationSetupSecret(secret);

  return `claude mcp add-json mp-learning '{
  "command": "npx",
  "args": ["-y", "${MCP_PACKAGE_URL}"],
  "env": {
    "CLASSROOMIO_API_URL": "${API_SERVER_URL}",
    "CLASSROOMIO_API_KEY": "${apiKey}"
  }
}'`;
}

export function getCodexSnippet(secret: string | null) {
  const apiKey = getAutomationSetupSecret(secret);

  return `codex mcp add mp-learning \\
  --env CLASSROOMIO_API_URL=${API_SERVER_URL} \\
  --env CLASSROOMIO_API_KEY=${apiKey} \\
  -- npx -y ${MCP_PACKAGE_URL}`;
}

export function getOpenCodeSnippet(secret: string | null) {
  const apiKey = getAutomationSetupSecret(secret);

  return `{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "mp-learning": {
      "type": "local",
      "command": ["npx", "-y", "${MCP_PACKAGE_URL}"],
      "enabled": true,
      "environment": {
        "CLASSROOMIO_API_URL": "${API_SERVER_URL}",
        "CLASSROOMIO_API_KEY": "${apiKey}"

      }
    }
  }
}`;
}

export function getCursorSnippet(secret: string | null) {
  const apiKey = getAutomationSetupSecret(secret);

  return `{
  "mcpServers": {
    "mp-learning": {
      "command": "npx",
      "args": ["-y", "${MCP_PACKAGE_URL}"],
      "env": {
        "CLASSROOMIO_API_URL": "${API_SERVER_URL}",
        "CLASSROOMIO_API_KEY": "${apiKey}"
      }
    }
  }
}`;
}

export function getDefaultAutomationKeyLabel(type: AutomationKeyType) {
  switch (type) {
    case 'mcp':
      return 'MP Learning MCP';
    case 'api':
      return 'MP Learning API';
    case 'zapier':
      return 'MP Learning Zapier';
  }
}

export function getAutomationKeyTypeLabel(type: AutomationKeyType) {
  switch (type) {
    case 'mcp':
      return 'MCP';
    case 'api':
      return 'API';
    case 'zapier':
      return 'Zapier';
  }
}

export function getMaskedAutomationSecret(prefix: string) {
  return `${prefix}...`;
}

export function getCopyableServerCommand() {
  return getServerPath();
}
