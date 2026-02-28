import "package:flutter/material.dart";
import "package:shared_preferences/shared_preferences.dart";
import "package:pinky_mobile/core/api_client.dart";
import "package:pinky_mobile/core/models.dart";
import "package:pinky_mobile/features/microtasks/presentation/microtask_list_screen.dart";
import "package:pinky_mobile/features/microtasks/presentation/my_tasks_screen.dart";

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
                              "${membership.organization.name} (${membership.role}) [${membership.strikeScore} 🪙]"
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
                        : "Active Organization: ${activeOrg.name} (${activeOrg.id}) - My Score: ${active.first.strikeScore} 🪙"
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
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: _activeOrgId == null
                        ? null
                        : () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (context) => MyTasksScreen(
                                  accessToken: widget.accessToken,
                                  orgId: _activeOrgId!
                                ),
                              )
                            );
                          },
                    child: const Text("Meine Aufgaben ansehen"),
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
