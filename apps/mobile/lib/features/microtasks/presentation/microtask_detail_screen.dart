import "package:flutter/material.dart";
import "package:pinky_mobile/core/api_client.dart";
import "package:pinky_mobile/core/models.dart";

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

  Future<void> _joinQueue() async {
    setState(() => _loading = true);
    try {
      await ApiClient.joinQueue(
        widget.accessToken,
        widget.orgId,
        widget.microTaskId
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("In die Warteschlange eingetragen"))
        );
      }
      await _loadDetail();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: Colors.red)
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _leaveQueue() async {
    setState(() => _loading = true);
    try {
      await ApiClient.leaveQueue(
        widget.accessToken,
        widget.orgId,
        widget.microTaskId
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Warteschlange verlassen"))
        );
      }
      await _loadDetail();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: Colors.red)
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
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
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Text(
                                  _microTask!.title,
                                  style: const TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.w600
                                  ),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                decoration: BoxDecoration(
                                  color: Colors.teal.shade700,
                                  borderRadius: BorderRadius.circular(16)
                                ),
                                child: Text(
                                  "${_microTask!.rewardPoints} 🪙",
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                )
                              )
                            ],
                          ),
                          const SizedBox(height: 12),
                          Text("Task: ${_microTask!.taskTitle}"),
                          Text("Status: ${_microTask!.status}"),
                          if (_microTask!.description != null)
                            Text("Projekt-Kontext: ${_microTask!.description}"),
                          if (_microTask!.dueAt != null)
                            Text(
                              "Fällig: ${_microTask!.dueAt!.split("T").first}"
                            ),
                          if (_microTask!.location != null)
                            Text("Wo: ${_microTask!.location}"),
                          if (_microTask!.contactPerson != null)
                            Text("Wer (Ansprechpartner): ${_microTask!.contactPerson}"),
                          if (_microTask!.estimatedDuration != null)
                            Text("Dauer: ${_microTask!.estimatedDuration}"),
                          if (_microTask!.attachments != null)
                            Text("Unterlagen/Link: ${_microTask!.attachments}", style: const TextStyle(color: Colors.blue)),
                          
                          if (_microTask!.descriptionHow != null) ...[
                            const SizedBox(height: 16),
                            const Text(
                              "Wie? (Ausführungshinweise)",
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.teal),
                            ),
                            Container(
                              padding: const EdgeInsets.all(12),
                              margin: const EdgeInsets.only(top: 8),
                              decoration: BoxDecoration(
                                color: Colors.teal.shade50,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(_microTask!.descriptionHow!),
                            ),
                          ],
                          
                          if (_microTask!.impactReason != null) ...[
                            const SizedBox(height: 16),
                            const Text(
                              "Warum ist diese Aufgabe wichtig?",
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.orange),
                            ),
                            Container(
                              padding: const EdgeInsets.all(12),
                              margin: const EdgeInsets.only(top: 8),
                              decoration: BoxDecoration(
                                color: Colors.orange.shade50,
                                border: Border.all(color: Colors.orange.shade200),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(_microTask!.impactReason!),
                            ),
                          ],
                          
                          if (_microTask!.status == "ASSIGNED") ...[
                            const SizedBox(height: 24),
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade100,
                                border: Border.all(color: Colors.grey.shade300, style: BorderStyle.solid),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  const Text(
                                    "Warteschlange",
                                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)
                                  ),
                                  const SizedBox(height: 8),
                                  const Text(
                                    "Diese Aufgabe ist momentan vergeben. Möchtest du einspringen, falls der aktuelle Bearbeiter abspringt?",
                                    style: TextStyle(color: Colors.black87)
                                  ),
                                  const SizedBox(height: 16),
                                  ElevatedButton(
                                    onPressed: _joinQueue,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.amber.shade200,
                                      foregroundColor: Colors.black87
                                    ),
                                    child: const Text("Eintragen")
                                  ),
                                  const SizedBox(height: 8),
                                  TextButton(
                                    onPressed: _leaveQueue,
                                    style: TextButton.styleFrom(
                                      foregroundColor: Colors.red
                                    ),
                                    child: const Text("Warteschlange verlassen")
                                  )
                                ],
                              )
                            )
                          ],

                          const SizedBox(height: 16),
                          Text(
                            "Erstellt: ${_microTask!.createdAt.split("T").first}",
                            style: const TextStyle(color: Colors.grey, fontSize: 12)
                          )
                        ],
                      ),
      ),
    );
  }
}
