import { open, showToast, Toast } from "@raycast/api";

export default async function OpenCalendar() {
  try {
    await open("https://app.usemotion.com/web/calendar");
    await showToast({
      style: Toast.Style.Success,
      title: "Opening Motion Calendar",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open calendar",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
