import "package:flutter/material.dart";
import "package:shared_preferences/shared_preferences.dart";

import "package:pinky_mobile/features/auth/presentation/login_screen.dart";
import "package:pinky_mobile/features/workspace/presentation/workspace_screen.dart";

void main() {
  runApp(const PinkyMobileApp());
}

class PinkyMobileApp extends StatefulWidget {
  const PinkyMobileApp({super.key});

  @override
  State<PinkyMobileApp> createState() => _PinkyMobileAppState();
}

class _PinkyMobileAppState extends State<PinkyMobileApp> {
  String? _accessToken;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadToken();
  }

  Future<void> _loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _accessToken = prefs.getString("accessToken");
      _loading = false;
    });
  }

  Future<void> _handleLogin(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString("accessToken", token);
    setState(() {
      _accessToken = token;
    });
  }

  Future<void> _handleLogout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove("accessToken");
    await prefs.remove("activeOrgId");
    setState(() {
      _accessToken = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const MaterialApp(
        home: Scaffold(
          body: Center(child: CircularProgressIndicator()),
        ),
      );
    }
    return MaterialApp(
      title: "Pinky Mobile",
      home: _accessToken == null
          ? LoginScreen(onLogin: _handleLogin)
          : WorkspaceScreen(
              accessToken: _accessToken!,
              onLogout: _handleLogout
            ),
    );
  }
}
