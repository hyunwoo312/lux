import { useNoteStore } from "@/widgets/note/useNoteStore";

const store = () => useNoteStore.getState();

describe("useNoteStore", () => {
  beforeEach(() => {
    useNoteStore.setState({ text: "", fontSize: "base" });
  });

  it("replaces the note text", () => {
    store().setText("first");
    store().setText("second");

    expect(store().text).toBe("second");
  });

  it("sets the font size", () => {
    store().setFontSize("lg");

    expect(store().fontSize).toBe("lg");
  });
});
