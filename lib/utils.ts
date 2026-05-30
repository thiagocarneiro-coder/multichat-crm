export function generateSessionCode(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  
  let randomLetters = '';
  for (let i = 0; i < 3; i++) {
    randomLetters += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  
  let randomNumbers = '';
  for (let i = 0; i < 4; i++) {
    randomNumbers += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  
  return `${randomLetters}-${randomNumbers}`;
}
