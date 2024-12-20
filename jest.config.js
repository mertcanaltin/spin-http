module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/src/__tests__/**/*.test.ts"], // Sadece src/__tests__ altındaki test dosyalarını çalıştır
  modulePathIgnorePatterns: ["dist"], // dist klasörünü yoksay
};
