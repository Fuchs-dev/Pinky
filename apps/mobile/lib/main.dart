import "package:flutter/material.dart";

void main() {
  runApp(const PinkyMobileApp());
}

class PinkyMobileApp extends StatelessWidget {
  const PinkyMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: "Pinky Mobile",
      home: Scaffold(
        appBar: AppBar(
          title: const Text("Pinky Mobile"),
        ),
        body: const Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                "Pinky Mobile",
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text("Active Organization: [placeholder]"),
            ],
          ),
        ),
      ),
    );
  }
}
