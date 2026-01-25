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
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _activeOrgId == null
                        ? null
                        : () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (context) => MicroTaskListScreen(
                                  accessToken: widget.accessToken,
                                  orgId: _activeOrgId!
                                ),
                              )
                            );
                          },
                    child: const Text("Open MicroTask Feed"),
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

class MicroTaskListScreen extends StatefulWidget {
  const MicroTaskListScreen({
    super.key,
    required this.accessToken,
    required this.orgId
  });

  final String accessToken;
  final String orgId;

  @override
  State<MicroTaskListScreen> createState() => _MicroTaskListScreenState();
}

class _MicroTaskListScreenState extends State<MicroTaskListScreen> {
  List<MicroTaskSummary> _microTasks = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadMicroTasks();
  }

  Future<void> _loadMicroTasks() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await ApiClient.fetchMicroTasks(
        widget.accessToken,
        widget.orgId
      );
      setState(() {
        _microTasks = data;
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("MicroTasks")),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Fehler beim Laden",
                        style: TextStyle(color: Colors.red)
                      ),
                      const SizedBox(height: 12),
                      ElevatedButton(
                        onPressed: _loadMicroTasks,
                        child: const Text("Retry")
                      )
                    ],
                  )
                : _microTasks.isEmpty
                    ? const Text("Keine offenen Aufgaben")
                    : ListView.separated(
                        itemCount: _microTasks.length,
                        separatorBuilder: (_, __) =>
                            const Divider(height: 24),
                        itemBuilder: (context, index) {
                          final microTask = _microTasks[index];
                          return ListTile(
                            title: Text(microTask.title),
                            subtitle: Text(
                              "${microTask.taskTitle} • ${microTask.status}"
                            ),
                            trailing: microTask.dueAt != null
                                ? Text(
                                    microTask.dueAt!.split("T").first
                                  )
                                : null,
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (context) => MicroTaskDetailScreen(
                                    accessToken: widget.accessToken,
                                    orgId: widget.orgId,
                                    microTaskId: microTask.id
                                  ),
                                )
                              );
                            },
                          );
                        },
                      ),
      ),
    );
  }
}

class MicroTaskDetailScreen extends StatefulWidget {
  const MicroTaskDetailScreen({
    super.key,
    required this.accessToken,
    required this.orgId,
    required this.microTaskId
  });

  final String accessToken;
  final String orgId;
  final String microTaskId;

  @override
  State<MicroTaskDetailScreen> createState() => _MicroTaskDetailScreenState();
}

class _MicroTaskDetailScreenState extends State<MicroTaskDetailScreen> {
  MicroTaskDetail? _microTask;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadDetail();
  }

  Future<void> _loadDetail() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await ApiClient.fetchMicroTaskDetail(
        widget.accessToken,
        widget.orgId,
        widget.microTaskId
      );
      setState(() {
        _microTask = data;
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("MicroTask Detail")),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Fehler beim Laden",
                        style: TextStyle(color: Colors.red)
                      ),
                      const SizedBox(height: 12),
                      ElevatedButton(
                        onPressed: _loadDetail,
                        child: const Text("Retry")
                      )
                    ],
                  )
                : _microTask == null
                    ? const Text("Keine Aufgabe gefunden")
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _microTask!.title,
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w600
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text("Task: ${_microTask!.taskTitle}"),
                          Text("Status: ${_microTask!.status}"),
                          if (_microTask!.description != null)
                            Text("Beschreibung: ${_microTask!.description}"),
                          if (_microTask!.dueAt != null)
                            Text(
                              "Fällig: ${_microTask!.dueAt!.split("T").first}"
                            ),
                          Text(
                            "Erstellt: ${_microTask!.createdAt.split("T").first}"
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

class MicroTaskSummary {
  MicroTaskSummary({
    required this.id,
    required this.title,
    required this.status,
    required this.taskTitle,
    required this.dueAt
  });

  final String id;
  final String title;
  final String status;
  final String taskTitle;
  final String? dueAt;

  factory MicroTaskSummary.fromJson(Map<String, dynamic> json) {
    final task = json["task"] as Map<String, dynamic>?;
    return MicroTaskSummary(
      id: json["id"] as String,
      title: json["title"] as String,
      status: json["status"] as String,
      taskTitle: task?["title"] as String? ?? "Unbekannt",
      dueAt: json["dueAt"] as String?
    );
  }
}

class MicroTaskDetail {
  MicroTaskDetail({
    required this.id,
    required this.title,
    required this.status,
    required this.taskTitle,
    required this.description,
    required this.dueAt,
    required this.createdAt
  });

  final String id;
  final String title;
  final String status;
  final String taskTitle;
  final String? description;
  final String? dueAt;
  final String createdAt;

  factory MicroTaskDetail.fromJson(Map<String, dynamic> json) {
    final task = json["task"] as Map<String, dynamic>?;
    return MicroTaskDetail(
      id: json["id"] as String,
      title: json["title"] as String,
      status: json["status"] as String,
      taskTitle: task?["title"] as String? ?? "Unbekannt",
      description: json["description"] as String?,
      dueAt: json["dueAt"] as String?,
      createdAt: json["createdAt"] as String
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

  static Map<String, String> _authHeaders(String token, String orgId) => {
    "Authorization": "Bearer $token",
    "X-Org-Id": orgId
  };

  static Future<List<MicroTaskSummary>> fetchMicroTasks(
    String token,
    String orgId
  ) async {
    final response = await http.get(
      Uri.parse("$apiBaseUrl/microtasks?status=OPEN"),
      headers: _authHeaders(token, orgId)
    );
    if (response.statusCode != 200) {
      throw Exception("Unable to load microtasks");
    }
    final payload = jsonDecode(response.body) as List<dynamic>;
    return payload
        .map((item) => MicroTaskSummary.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  static Future<MicroTaskDetail> fetchMicroTaskDetail(
    String token,
    String orgId,
    String microTaskId
  ) async {
    final response = await http.get(
      Uri.parse("$apiBaseUrl/microtasks/$microTaskId"),
      headers: _authHeaders(token, orgId)
    );
    if (response.statusCode != 200) {
      throw Exception("Unable to load microtask detail");
    }
    final payload = jsonDecode(response.body) as Map<String, dynamic>;
    return MicroTaskDetail.fromJson(payload);
  }
}
