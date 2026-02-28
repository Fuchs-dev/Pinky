import "package:flutter/material.dart";
import "package:pinky_mobile/core/api_client.dart";
import "package:pinky_mobile/core/models.dart";
import "microtask_detail_screen.dart";

class MyTasksScreen extends StatefulWidget {
  const MyTasksScreen({
    super.key,
    required this.accessToken,
    required this.orgId
  });

  final String accessToken;
  final String orgId;

  @override
  State<MyTasksScreen> createState() => _MyTasksScreenState();
}

class _MyTasksScreenState extends State<MyTasksScreen> {
  List<MicroTaskSummary> _assigned = [];
  List<MicroTaskSummary> _done = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadMyTasks();
  }

  Future<void> _loadMyTasks() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final allTasks = await ApiClient.fetchMyMicroTasks(
        widget.accessToken,
        widget.orgId
      );
      setState(() {
        _assigned = allTasks.where((t) => t.status == "ASSIGNED").toList();
        _done = allTasks.where((t) => t.status == "DONE").toList();
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

  Future<void> _handleComplete(String microTaskId) async {
    try {
      await ApiClient.completeTask(widget.accessToken, widget.orgId, microTaskId);
      _loadMyTasks();
    } catch (error) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Meine Aufgaben")),
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
                        onPressed: _loadMyTasks,
                        child: const Text("Retry")
                      )
                    ],
                  )
                : _assigned.isEmpty && _done.isEmpty
                    ? const Text("Du hast keine Aufgaben übernommen.")
                    : ListView(
                        children: [
                          if (_assigned.isNotEmpty) ...[
                            const Text("Aktuell zu tun", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.teal)),
                            const SizedBox(height: 12),
                            ..._assigned.map((microTask) => Card(
                              shape: RoundedRectangleBorder(
                                side: BorderSide(color: Colors.teal, width: 2),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: ListTile(
                                title: Text(microTask.title),
                                subtitle: Text("${microTask.taskTitle} • ${microTask.dueAt?.split("T").first ?? ""}"),
                                trailing: ElevatedButton(
                                  style: ElevatedButton.styleFrom(backgroundColor: Colors.teal, foregroundColor: Colors.white),
                                  onPressed: () => _handleComplete(microTask.id),
                                  child: const Text("Erledigt"),
                                ),
                                onTap: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (context) => MicroTaskDetailScreen(accessToken: widget.accessToken, orgId: widget.orgId, microTaskId: microTask.id),
                                    )
                                  );
                                },
                              )
                            )),
                            const SizedBox(height: 24),
                          ],
                          if (_done.isNotEmpty) ...[
                            const Text("Abgeschlossen", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.grey)),
                            const SizedBox(height: 12),
                            ..._done.map((microTask) => Card(
                              color: Colors.grey[200],
                              child: ListTile(
                                title: Text("${microTask.title} (Erledigt)", style: TextStyle(color: Colors.grey[700])),
                                subtitle: Text("${microTask.taskTitle}", style: TextStyle(color: Colors.grey[700])),
                                onTap: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (context) => MicroTaskDetailScreen(accessToken: widget.accessToken, orgId: widget.orgId, microTaskId: microTask.id),
                                    )
                                  );
                                },
                              )
                            )),
                          ]
                        ]
                      ),
      ),
    );
  }
}
