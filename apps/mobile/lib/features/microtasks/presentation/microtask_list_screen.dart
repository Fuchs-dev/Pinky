import "package:flutter/material.dart";
import "package:pinky_mobile/core/api_client.dart";
import "package:pinky_mobile/core/models.dart";
import "microtask_detail_screen.dart";

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
  MicroTaskFeed? _microTasks;
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

  Future<void> _handleAccept(String microTaskId) async {
    try {
      await ApiClient.acceptOffer(widget.accessToken, widget.orgId, microTaskId);
      _loadMicroTasks();
    } catch (error) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
    }
  }

  Future<void> _handleReject(String microTaskId) async {
    try {
      await ApiClient.rejectOffer(widget.accessToken, widget.orgId, microTaskId);
      _loadMicroTasks();
    } catch (error) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
    }
  }

  Future<void> _handleAssign(String microTaskId) async {
    try {
      await ApiClient.assignTask(widget.accessToken, widget.orgId, microTaskId);
      _loadMicroTasks();
    } catch (error) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
    }
  }

  Future<void> _handleJoinQueue(String microTaskId) async {
    try {
      await ApiClient.joinQueue(widget.accessToken, widget.orgId, microTaskId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Erfolgreich in die Warteschlange eingetragen")));
      }
      _loadMicroTasks();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
      }
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
                : _microTasks == null || (_microTasks!.offered.isEmpty && _microTasks!.open.isEmpty)
                    ? const Text("Keine offenen Aufgaben")
                    : Builder(
                        builder: (context) {
                          final actualOpen = _microTasks!.open.where((t) => t.status == "OPEN").toList();
                          final waitlist = _microTasks!.open.where((t) => t.status == "ASSIGNED").toList();

                          return ListView(
                            children: [
                              if (_microTasks!.offered.isNotEmpty) ...[
                                const Text("Angebote für mich", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 12),
                                ..._microTasks!.offered.map((microTask) => Card(
                                  color: Colors.cyan[50],
                                  child: ListTile(
                                    title: Text("${microTask.title} [${microTask.rewardPoints} 🪙]", style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.teal)),
                                    subtitle: Text("${microTask.taskTitle} • ${microTask.dueAt?.split("T").first ?? ""}"),
                                    isThreeLine: true,
                                    trailing: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        IconButton(icon: const Icon(Icons.check, color: Colors.green), onPressed: () => _handleAccept(microTask.id)),
                                        IconButton(icon: const Icon(Icons.close, color: Colors.red), onPressed: () => _handleReject(microTask.id)),
                                      ],
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
                              if (actualOpen.isNotEmpty) ...[
                                const Text("Weitere offene Aufgaben", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 12),
                                ...actualOpen.map((microTask) => Card(
                                  child: ListTile(
                                    title: Text("${microTask.title} [${microTask.rewardPoints} 🪙]", style: const TextStyle(fontWeight: FontWeight.bold)),
                                    subtitle: Text("${microTask.taskTitle} • ${microTask.dueAt?.split("T").first ?? ""}"),
                                    trailing: ElevatedButton(
                                      child: const Text("Übernehmen"),
                                      onPressed: () => _handleAssign(microTask.id),
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
                              if (waitlist.isNotEmpty) ...[
                                const Text("Letzte Chance (Warteliste)", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.grey)),
                                const SizedBox(height: 4),
                                const Text("Diese Aufgaben sind vergeben. Trage dich ein, falls jemand abspringt!", style: TextStyle(fontSize: 13, color: Colors.grey)),
                                const SizedBox(height: 12),
                                ...waitlist.map((microTask) => Card(
                                  color: Colors.grey[100],
                                  elevation: 0,
                                  shape: RoundedRectangleBorder(
                                    side: BorderSide(color: Colors.grey[300]!, width: 1),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: ListTile(
                                    title: Text("${microTask.title} [${microTask.rewardPoints} 🪙]", style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.black54)),
                                    subtitle: Text("${microTask.taskTitle} • ${microTask.dueAt?.split("T").first ?? ""}", style: const TextStyle(color: Colors.black54)),
                                    trailing: OutlinedButton(
                                      style: OutlinedButton.styleFrom(
                                        foregroundColor: Colors.brown,
                                        side: const BorderSide(color: Colors.brown)
                                      ),
                                      child: const Text("Warteliste"),
                                      onPressed: () => _handleJoinQueue(microTask.id),
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
                              ]
                            ]
                          );
                        }
                      ),
      ),
    );
  }
}
