// 1. Mock the module BEFORE importing it
jest.mock("./microsoft", () => {
    const original = jest.requireActual("./microsoft");
    return {
      ...original,
      graphGet: jest.fn(), // <-- this replaces the private function
    };
  });
  
  import { createMicrosoftProvider } from "./microsoft";
  
  describe("Microsoft provider - getMessage()", () => {
    it("maps a Graph message into EmailMessage correctly", async () => {
      const provider = createMicrosoftProvider();
  
      // Mock Graph API response
      (graphGet as jest.Mock).mockResolvedValue({
        id: "123",
        receivedDateTime: "2024-01-01T12:00:00Z",
        subject: "Hello World",
        bodyPreview: "Preview text",
        from: {
          emailAddress: {
            name: "Alice",
            address: "alice@example.com",
          },
        },
        body: {
          contentType: "html",
          content: "<p>Hello <b>world</b></p>",
        },
        internetMessageHeaders: [],
      });
  
      const msg = await provider.getMessage("123");
  
      // Validate mapping
      expect(msg).toMatchObject({
        id: "123",
        subject: "Hello World",
        senderEmail: "alice@example.com",
        senderName: "Alice",
        snippet: "Preview text",
        unsubscribeMethod: "none",
      });
  
      // Ensure graphGet was called
      expect(graphGet).toHaveBeenCalledTimes(1);
    });
  });
  