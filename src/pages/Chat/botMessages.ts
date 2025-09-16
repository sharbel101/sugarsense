export const getBotResponse = (userMessage: string): string => {
  // Simple logic for now, can be expanded later
  if (userMessage.toLowerCase().includes('hello')) {
    return 'Hello there!';
  } else if (userMessage.toLowerCase().includes('help')) {
    return 'How can I assist you?';
  } else {
    return 'This is a sample bot response.';
  }
};
