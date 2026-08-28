// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SpotifySetup } from "@/settings/components/SpotifySetup";

const CLIENT_ID = "0123456789abcdef0123456789abcdef";

describe("SpotifySetup", () => {
  it("saves a 32-character client ID and reports it saved", async () => {
    const onSave = vi.fn(async () => {});
    const { rerender } = render(
      <SpotifySetup clientId={undefined} redirectUri={null} onSave={onSave} />,
    );

    fireEvent.change(screen.getByLabelText("Spotify Client ID"), {
      target: { value: CLIENT_ID },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(CLIENT_ID));

    rerender(<SpotifySetup clientId={CLIENT_ID} redirectUri={null} onSave={onSave} />);
    expect(await screen.findAllByText("Saved")).not.toHaveLength(0);
  });
});
