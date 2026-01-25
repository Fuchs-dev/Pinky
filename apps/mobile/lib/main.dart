import "dart:convert";

import "package:flutter/material.dart";
import "package:http/http.dart" as http;
import "package:shared_preferences/shared_preferences.dart";

const apiBaseUrl = String.fromEnvironment(
  "API_BASE_URL",
  defaultValue: "http://localhost:3001"
);

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

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.onLogin});

  final Future<void> Function(String token) onLogin;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _controller = TextEditingController();
  String? _error;
  bool _submitting = false;

  Future<void> _submit() async {
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final token = await ApiClient.login(_controller.text);
      await widget.onLogin(token);
    } catch (error) {
      setState(() {
        _error = error.toString();
      });
    } finally {
      setState(() {
        _submitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Pinky Login")),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "Enter your email",
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _controller,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: "Email",
                border: OutlineInputBorder()
              ),
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _submitting ? null : _submit,
              child: Text(_submitting ? "Signing in..." : "Login"),
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(
                  _error!,
                  style: const TextStyle(color: Colors.red)
                ),
              )
          ],
        ),
      ),
    );
  }
}

class WorkspaceScreen extends StatefulWidget {
  const WorkspaceScreen({
    super.key,
    required this.accessToken,
    required this.onLogout
  });

  final String accessToken;
  final Future<void> Function() onLogout;

  @override
  State<WorkspaceScreen> createState() => _WorkspaceScreenState();
}

class _WorkspaceScreenState extends State<WorkspaceScreen> {
  List<Membership> _memberships = [];
  String? _activeOrgId;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadMemberships();
  }

  Future<void> _loadMemberships() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final prefs = await SharedPreferences.getInstance();
      final storedOrgId = prefs.getString("activeOrgId");
      final memberships = await ApiClient.fetchMemberships(
        widget.accessToken
      );
      String? activeOrgId = storedOrgId;
      if (activeOrgId == null && memberships.isNotEmpty) {
        activeOrgId = memberships.first.organization.id;
        await prefs.setString("activeOrgId", activeOrgId);
      }
      setState(() {
        _memberships = memberships;
        _activeOrgId = activeOrgId;
      });
    } catch (error) {
      setState(() {
        _error = error.toString();
      });
    } finally {
      setState(() {
        _loading = false;
      });
    }
  }

  Future<void> _handleOrgChange(String? orgId) async {
    if (orgId == null) {
      return;
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString("activeOrgId", orgId);
    setState(() {
      _activeOrgId = orgId;
    });
  }

  @override
  Widget build(BuildContext context) {
    final active = _memberships
        .where((membership) => membership.organization.id == _activeOrgId)
        .toList();
    final activeOrg = active.isNotEmpty ? active.first.organization : null;

    return Scaffold(
      appBar: AppBar(
        title: const Text("Pinky Workspace"),
        actions: [
          IconButton(
            onPressed: widget.onLogout,
            icon: const Icon(Icons.logout)
          )
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    "Workspace Switcher",
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 12),
                  DropdownButton<String>(
                    value: _activeOrgId,
                    items: _memberships
                        .map(
                          (membership) => DropdownMenuItem(
                            value: membership.organization.id,
                            child: Text(
                              "${membership.organization.name} (${membership.role})"
                            ),
                          ),
                        )
                        .toList(),
                    onChanged: _handleOrgChange,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    activeOrg == null
                        ? "Active Organization: None"
                        : "Active Organization: ${activeOrg.name} (${activeOrg.id})"
                  ),
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Text(
                        _error!,
                        style: const TextStyle(color: Colors.red)
                      ),
                    )
                ],
              ),
      ),
    );
  }
}

class Membership {
  Membership({required this.organization, required this.role});

  final Organization organization;
  final String role;

  factory Membership.fromJson(Map<String, dynamic> json) {
    return Membership(
      organization: Organization.fromJson(
        json["organization"] as Map<String, dynamic>
      ),
      role: json["role"] as String
    );
  }
}

class Organization {
  Organization({required this.id, required this.name});

  final String id;
  final String name;

  factory Organization.fromJson(Map<String, dynamic> json) {
    return Organization(
      id: json["id"] as String,
      name: json["name"] as String
    );
  }
}

class ApiClient {
  static Future<String> login(String email) async {
    final response = await http.post(
      Uri.parse("$apiBaseUrl/auth/login"),
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({"email": email})
    );
    if (response.statusCode != 200) {
      throw Exception("Login failed");
    }
    final payload = jsonDecode(response.body) as Map<String, dynamic>;
    return payload["accessToken"] as String;
  }

  static Future<List<Membership>> fetchMemberships(String token) async {
    final response = await http.get(
      Uri.parse("$apiBaseUrl/me/memberships"),
      headers: {"Authorization": "Bearer $token"}
    );
    if (response.statusCode != 200) {
      throw Exception("Unable to load memberships");
    }
    final payload = jsonDecode(response.body) as List<dynamic>;
    return payload
        .map((item) => Membership.fromJson(item as Map<String, dynamic>))
        .toList();
  }
}
