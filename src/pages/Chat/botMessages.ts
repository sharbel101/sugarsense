export const getBotResponse = (userMessage: string): string => {
  // Simple logic for now, can be expanded later
  if (userMessage.toLowerCase().includes('hello')) {
    return 'Hello! Please send a photo of your food for analysis, or type "help" for more info.';
  } else if (userMessage.toLowerCase().includes('help')) {
    return (
      'Welcome to SugarSense — Your Smart Diabetes Companion\n' +
      'SugarSense helps you understand your meals, track your blood sugar, and stay in control with simple, easy-to-use features.\n\n' +
      'Instant Meal Analysis\n' +
      'Take a photo of your food and SugarSense instantly estimates carbohydrates, calories, and glycemic index. It can also suggest insulin doses based on your personal needs. Every meal is automatically saved with its image and nutritional details.\n\n' +
      'Blood Glucose Predictions\n' +
      'Enter your current blood sugar, carbs, and insulin dose, and SugarSense shows how your levels may change over the next few hours.\n' +
      'A clear color-coded graph highlights safe, high, and low ranges, along with your predicted peak.\n\n' +
      'Meal History and Daily Insights\n' +
      'Review your past meals with pictures and nutritional breakdowns.\n' +
      'Track your daily totals and long-term trends to better understand your patterns.\n\n' +
      'Doctor Dashboard (For Healthcare Providers)\n' +
      'Healthcare providers can securely view their patients’ meal logs and glucose data, monitor progress, and identify patterns over time.\n\n' +
      'Patient Overview\n' +
      'Doctors can see detailed profiles that include meal history, daily summaries, and insulin settings.'
    );
  } else {
    return 'Please send an image of your food for analysis, or type "help" for more info.';
  }
};
