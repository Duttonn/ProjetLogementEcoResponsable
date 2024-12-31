#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>

#include "DHT.h"  // Use the DHT library for temperature and humidity

#define DHTTYPE DHT11
#define DHTPIN 0

DHT dht(DHTPIN, DHTTYPE);

// WiFi configuration
const char* ssid = "iPhoneNatao";
const char* password = "00000000";
const char* serverName = "http://172.20.10.2:8000/mesure/";  // FastAPI endpoint

void setup() {
  Serial.begin(115200);
  dht.begin();
  WiFi.begin(ssid, password);

  Serial.println("Connecting to WiFi...");
  
  int attempt = 0;
  int max_attempts = 20;  // 10 seconds (500ms x 20)

  while (WiFi.status() != WL_CONNECTED && attempt < max_attempts) {
    delay(500);
    Serial.print(".");
    attempt++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\nFailed to connect to WiFi.");
    return;
  }

  Serial.println("\nConnected to WiFi");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    WiFiClient client;

    http.begin(client, "http://192.168.1.81:8000/");
    int httpResponseCode = http.GET();
    Serial.print("GET Response Code: ");
    Serial.println(httpResponseCode);


    http.begin(client, serverName);

    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();

    if (!isnan(temperature) && !isnan(humidity)) {
      Serial.print("Temperature: ");
      Serial.print(temperature);
      Serial.println(" *C");

      // Send Temperature Measurement
      String postData = "{\"sensor_id\": 1, \"value\": " + String(temperature) + "}";
      http.addHeader("Content-Type", "application/json");
      int httpResponseCode = http.POST(postData);

      if (httpResponseCode > 0) {
        String response = http.getString();
        Serial.println("Temperature Response: " + response);
      } else {
        Serial.print("Error on sending Temperature POST: ");
        Serial.println(httpResponseCode);
      }
      http.end();


      // Send Humidity Measurement
      String postDatah = "{\"sensor_id\": 4, \"value\": " + String(humidity) + "}";
      http.addHeader("Content-Type", "application/json");
      int httpResponseCodeh = http.POST(postDatah);

      if (httpResponseCodeh > 0) {
        String response = http.getString();
        Serial.println("Humidity Response: " + response);
      } else {
        Serial.print("Error on sending Humidity POST: ");
        Serial.println(httpResponseCodeh);
      }
      http.end();
    } else {
      Serial.println("Failed to get temperature or humidity values.");
    }
  } else {
    Serial.println("WiFi Disconnected");
  }

  delay(10000);  // Send data every 10 seconds
}
