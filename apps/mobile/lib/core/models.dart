class Membership {
  Membership({required this.organization, required this.role, required this.strikeScore});

  final Organization organization;
  final String role;
  final int strikeScore;

  factory Membership.fromJson(Map<String, dynamic> json) {
    return Membership(
      organization: Organization.fromJson(
        json["organization"] as Map<String, dynamic>
      ),
      role: json["role"] as String,
      strikeScore: json["strikeScore"] as int? ?? 0
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
    required this.dueAt,
    required this.rewardPoints
  });

  final String id;
  final String title;
  final String status;
  final String taskTitle;
  final String? dueAt;
  final int rewardPoints;

  factory MicroTaskSummary.fromJson(Map<String, dynamic> json) {
    final task = json["task"] as Map<String, dynamic>?;
    return MicroTaskSummary(
      id: json["id"] as String,
      title: json["title"] as String,
      status: json["status"] as String,
      taskTitle: task?["title"] as String? ?? "Unbekannt",
      dueAt: (json["timeframe"] as String?) ?? (json["dueAt"] as String?),
      rewardPoints: json["rewardPoints"] as int? ?? 10
    );
  }
}

class MicroTaskFeed {
  MicroTaskFeed({required this.offered, required this.open});
  
  final List<MicroTaskSummary> offered;
  final List<MicroTaskSummary> open;

  factory MicroTaskFeed.fromJson(Map<String, dynamic> json) {
    final offeredList = json["offered"] as List<dynamic>? ?? [];
    final openList = json["open"] as List<dynamic>? ?? [];
    return MicroTaskFeed(
      offered: offeredList.map((e) => MicroTaskSummary.fromJson(e as Map<String, dynamic>)).toList(),
      open: openList.map((e) => MicroTaskSummary.fromJson(e as Map<String, dynamic>)).toList()
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
    required this.descriptionHow,
    required this.location,
    required this.contactPerson,
    required this.estimatedDuration,
    required this.attachments,
    required this.dueAt,
    required this.createdAt,
    required this.rewardPoints,
    required this.impactReason
  });

  final String id;
  final String title;
  final String status;
  final String taskTitle;
  final String? description;
  final String? descriptionHow;
  final String? location;
  final String? contactPerson;
  final String? estimatedDuration;
  final String? attachments;
  final String? dueAt;
  final String createdAt;
  final int rewardPoints;
  final String? impactReason;

  factory MicroTaskDetail.fromJson(Map<String, dynamic> json) {
    final task = json["task"] as Map<String, dynamic>?;
    return MicroTaskDetail(
      id: json["id"] as String,
      title: json["title"] as String,
      status: json["status"] as String,
      taskTitle: task?["title"] as String? ?? "Unbekannt",
      description: json["description"] as String?,
      descriptionHow: json["description_how"] as String?,
      location: json["location"] as String?,
      contactPerson: json["contactPerson"] as String?,
      estimatedDuration: json["estimatedDuration"] as String?,
      attachments: json["attachments"] as String?,
      dueAt: json["dueAt"] as String?,
      createdAt: json["createdAt"] as String,
      rewardPoints: json["rewardPoints"] as int? ?? 10,
      impactReason: json["impactReason"] as String?
    );
  }
}

class UserProfile {
  UserProfile({
    required this.id,
    required this.email,
    this.displayName,
    this.age,
    this.gender,
    this.department,
    this.interests,
    this.qualifications,
    this.hasDriversLicense,
    this.helpContext,
    this.weeklyTimeBudgetMinutes,
  });

  final String id;
  final String email;
  final String? displayName;
  final int? age;
  final String? gender;
  final String? department;
  final String? interests;
  final String? qualifications;
  final bool? hasDriversLicense;
  final String? helpContext;
  final int? weeklyTimeBudgetMinutes;

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] as String,
      email: json['email'] as String,
      displayName: json['displayName'] as String?,
      age: json['age'] as int?,
      gender: json['gender'] as String?,
      department: json['department'] as String?,
      interests: json['interests'] as String?,
      qualifications: json['qualifications'] as String?,
      hasDriversLicense: json['hasDriversLicense'] as bool?,
      helpContext: json['helpContext'] as String?,
      weeklyTimeBudgetMinutes: json['weeklyTimeBudgetMinutes'] as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (displayName != null) 'displayName': displayName,
      if (age != null) 'age': age,
      if (gender != null) 'gender': gender,
      if (department != null) 'department': department,
      if (interests != null) 'interests': interests,
      if (qualifications != null) 'qualifications': qualifications,
      if (hasDriversLicense != null) 'hasDriversLicense': hasDriversLicense,
      if (helpContext != null) 'helpContext': helpContext,
      if (weeklyTimeBudgetMinutes != null) 'weeklyTimeBudgetMinutes': weeklyTimeBudgetMinutes,
    };
  }
}
