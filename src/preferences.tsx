import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getApiKey, setApiKey, hasApiKey } from "./lib/preferences";
import { getWorkspaces } from "./lib/motion-api";

export default function Preferences() {
  const [currentKey, setCurrentKey] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    loadCurrentKey();
  }, []);

  async function loadCurrentKey() {
    const key = await getApiKey();
    setCurrentKey(key || "");
    setIsLoading(false);
  }

  async function handleSubmit(values: { apiKey: string }) {
    try {
      setIsLoading(true);
      await setApiKey(values.apiKey);
      await showToast({
        style: Toast.Style.Success,
        title: "API Key Saved",
        message: "Your Motion API key has been saved successfully.",
      });
      setCurrentKey(values.apiKey);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save API key",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function testApiKey(values: { apiKey: string }) {
    const key = values.apiKey || currentKey;
    if (!key || key.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No API Key",
        message: "Please enter an API key first.",
      });
      return;
    }

    try {
      setIsTesting(true);
      // Temporarily set the key to test
      await setApiKey(key);
      await getWorkspaces();
      await showToast({
        style: Toast.Style.Success,
        title: "API Key Valid",
        message: "Successfully connected to Motion API.",
      });
      setCurrentKey(key);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "API Key Invalid",
        message: error instanceof Error ? error.message : "Failed to connect to Motion API.",
      });
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <Form
      isLoading={isLoading || isTesting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Key}
            title="Save API Key"
            onSubmit={handleSubmit}
          />
          <Action.SubmitForm
            icon={Icon.CheckCircle}
            title="Test API Key"
            onSubmit={testApiKey}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
          />
          <Action.OpenInBrowser
            icon={Icon.Globe}
            title="Get API Key from Motion"
            url="https://app.usemotion.com/settings/api"
            shortcut={{ modifiers: ["cmd"], key: "g" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Motion API Key"
        text="Enter your Motion API key. You can generate one in Motion Settings > API."
      />
      <Form.PasswordField
        id="apiKey"
        title="API Key"
        placeholder="Enter your Motion API key"
        defaultValue={currentKey}
        info="Your API key is stored locally and never shared."
      />
      <Form.Separator />
      <Form.Description
        title="How to get your API key"
        text="1. Go to Motion Settings\n2. Navigate to the API section\n3. Generate a new API key\n4. Copy and paste it here"
      />
    </Form>
  );
}
