import "dart:convert";
import "package:http/http.dart" as http;
import "models.dart";

const apiBaseUrl = String.fromEnvironment(
  "API_BASE_URL",
  defaultValue: "http://localhost:3001"
);

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

  static Future<MicroTaskFeed> fetchMicroTasks(
    String token,
    String orgId
  ) async {
    final response = await http.get(
      Uri.parse("$apiBaseUrl/microtasks/feed"),
      headers: _authHeaders(token, orgId)
    );
    if (response.statusCode != 200) {
      throw Exception("Unable to load microtasks");
    }
    final payload = jsonDecode(response.body) as Map<String, dynamic>;
    return MicroTaskFeed.fromJson(payload);
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

  static Future<void> acceptOffer(String token, String orgId, String microTaskId) async {
    final response = await http.post(
      Uri.parse("$apiBaseUrl/microtasks/$microTaskId/offer/accept"),
      headers: _authHeaders(token, orgId)
    );
    if (response.statusCode != 200) throw Exception("Unable to accept offer");
  }

  static Future<void> rejectOffer(String token, String orgId, String microTaskId) async {
    final response = await http.post(
      Uri.parse("$apiBaseUrl/microtasks/$microTaskId/offer/reject"),
      headers: _authHeaders(token, orgId)
    );
    if (response.statusCode != 200) throw Exception("Unable to reject offer");
  }

  static Future<void> assignTask(String token, String orgId, String microTaskId) async {
    final response = await http.post(
      Uri.parse("$apiBaseUrl/microtasks/$microTaskId/assign"),
      headers: _authHeaders(token, orgId)
    );
    if (response.statusCode != 200) throw Exception("Unable to assign task");
  }

  static Future<void> completeTask(String token, String orgId, String microTaskId) async {
    final response = await http.post(
      Uri.parse("$apiBaseUrl/microtasks/$microTaskId/complete"),
      headers: _authHeaders(token, orgId)
    );
    if (response.statusCode != 200) throw Exception("Unable to complete task");
  }

  static Future<List<MicroTaskSummary>> fetchMyMicroTasks(String token, String orgId) async {
    final response = await http.get(
      Uri.parse("$apiBaseUrl/me/microtasks"),
      headers: _authHeaders(token, orgId)
    );
    if (response.statusCode != 200) throw Exception("Unable to load my tasks");
    final payload = jsonDecode(response.body) as List<dynamic>;
    return payload.map((e) => MicroTaskSummary.fromJson(e as Map<String, dynamic>)).toList();
  }

  static Future<void> joinQueue(String token, String orgId, String microTaskId) async {
    final response = await http.post(
      Uri.parse("$apiBaseUrl/microtasks/$microTaskId/queue/join"),
      headers: _authHeaders(token, orgId)
    );
    if (response.statusCode != 200) {
      final payload = jsonDecode(response.body);
      throw Exception(payload["message"] ?? "Unable to join queue");
    }
  }

  static Future<void> leaveQueue(String token, String orgId, String microTaskId) async {
    final response = await http.post(
      Uri.parse("$apiBaseUrl/microtasks/$microTaskId/queue/leave"),
      headers: _authHeaders(token, orgId)
    );
    if (response.statusCode != 200) {
      final payload = jsonDecode(response.body);
      throw Exception(payload["message"] ?? "Unable to leave queue");
    }
  }

  static Future<void> unassignTask(String token, String orgId, String microTaskId) async {
    final response = await http.post(
      Uri.parse("$apiBaseUrl/microtasks/$microTaskId/unassign"),
      headers: _authHeaders(token, orgId)
    );
    if (response.statusCode != 200) {
      final payload = jsonDecode(response.body);
      throw Exception(payload["message"] ?? "Unable to unassign task");
    }
  }

  static Future<UserProfile> fetchMyProfile(String token) async {
    final response = await http.get(
      Uri.parse("$apiBaseUrl/me"),
      headers: {"Authorization": "Bearer $token"}
    );
    if (response.statusCode != 200) {
      throw Exception("Unable to load profile");
    }
    final payload = jsonDecode(response.body) as Map<String, dynamic>;
    return UserProfile.fromJson(payload);
  }

  static Future<UserProfile> updateMyProfile(String token, UserProfile profileData) async {
    final response = await http.put(
      Uri.parse("$apiBaseUrl/me/profile"),
      headers: {
        "Authorization": "Bearer $token",
        "Content-Type": "application/json",
      },
      body: jsonEncode(profileData.toJson())
    );
    if (response.statusCode != 200) {
      throw Exception("Unable to update profile");
    }
    final payload = jsonDecode(response.body) as Map<String, dynamic>;
    return UserProfile.fromJson(payload);
  }
}
