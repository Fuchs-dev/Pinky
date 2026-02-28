import 'package:flutter/material.dart';
import '../core/api_client.dart';
import '../core/models.dart';

class ProfileScreen extends StatefulWidget {
  final String token;

  const ProfileScreen({Key? key, required this.token}) : super(key: key);

  @override
  _ProfileScreenState createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _isLoading = true;
  bool _isSaving = false;
  UserProfile? _profile;
  String? _errorMessage;
  String? _successMessage;

  final _formKey = GlobalKey<FormState>();

  // Controllers
  final _displayNameController = TextEditingController();
  final _ageController = TextEditingController();
  final _departmentController = TextEditingController();
  final _interestsController = TextEditingController();
  final _qualificationsController = TextEditingController();
  final _helpContextController = TextEditingController();
  final _timeBudgetController = TextEditingController();

  String? _selectedGender;
  bool _hasDriversLicense = false;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final profile = await ApiClient.fetchMyProfile(widget.token);
      _profile = profile;
      _displayNameController.text = profile.displayName ?? '';
      _ageController.text = profile.age?.toString() ?? '';
      _selectedGender = profile.gender;
      _departmentController.text = profile.department ?? '';
      _interestsController.text = profile.interests ?? '';
      _qualificationsController.text = profile.qualifications ?? '';
      _helpContextController.text = profile.helpContext ?? '';
      _timeBudgetController.text = profile.weeklyTimeBudgetMinutes?.toString() ?? '0';
      _hasDriversLicense = profile.hasDriversLicense ?? false;
      
    } catch (e) {
      _errorMessage = "Fehler beim Laden: $e";
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() {
      _isSaving = true;
      _errorMessage = null;
      _successMessage = null;
    });

    try {
      final newProfile = UserProfile(
        id: _profile!.id,
        email: _profile!.email,
        displayName: _displayNameController.text.isNotEmpty ? _displayNameController.text : null,
        age: int.tryParse(_ageController.text),
        gender: _selectedGender,
        department: _departmentController.text.isNotEmpty ? _departmentController.text : null,
        interests: _interestsController.text.isNotEmpty ? _interestsController.text : null,
        qualifications: _qualificationsController.text.isNotEmpty ? _qualificationsController.text : null,
        helpContext: _helpContextController.text.isNotEmpty ? _helpContextController.text : null,
        weeklyTimeBudgetMinutes: int.tryParse(_timeBudgetController.text) ?? 0,
        hasDriversLicense: _hasDriversLicense,
      );

      final updated = await ApiClient.updateMyProfile(widget.token, newProfile);
      _profile = updated;
      _successMessage = "Profil erfolgreich gespeichert!";
    } catch (e) {
      _errorMessage = "Fehler beim Speichern: $e";
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mein Profil')),
      body: _isLoading 
          ? const Center(child: CircularProgressIndicator())
          : _profile == null
              ? Center(child: Text(_errorMessage ?? "Unbekannter Fehler"))
              : _buildForm(),
    );
  }

  Widget _buildForm() {
    final currentAge = int.tryParse(_ageController.text) ?? 0;
    
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("Email: ${_profile!.email}", style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: 16),

            if (_errorMessage != null)
              Container(
                padding: const EdgeInsets.all(8),
                color: Colors.red.shade100,
                child: Text(_errorMessage!, style: const TextStyle(color: Colors.red)),
              ),
            if (_successMessage != null)
              Container(
                padding: const EdgeInsets.all(8),
                color: Colors.green.shade100,
                child: Text(_successMessage!, style: const TextStyle(color: Colors.green)),
              ),

            const SizedBox(height: 16),

            TextFormField(
              controller: _displayNameController,
              decoration: const InputDecoration(labelText: 'Anzeigename'),
            ),
            const SizedBox(height: 12),

            TextFormField(
              controller: _ageController,
              decoration: const InputDecoration(labelText: 'Alter'),
              keyboardType: TextInputType.number,
              onChanged: (val) {
                setState(() {}); // trigger rebuild to check age constraint for drivers license
              },
            ),
            const SizedBox(height: 12),

            DropdownButtonFormField<String>(
              value: _selectedGender,
              decoration: const InputDecoration(labelText: 'Geschlecht'),
              items: const [
                DropdownMenuItem(value: null, child: Text('Keine Angabe')),
                DropdownMenuItem(value: 'female', child: Text('Weiblich')),
                DropdownMenuItem(value: 'male', child: Text('Männlich')),
                DropdownMenuItem(value: 'diverse', child: Text('Divers')),
                DropdownMenuItem(value: 'preferNotToSay', child: Text('Möchte ich nicht sagen')),
              ],
              onChanged: (val) {
                setState(() => _selectedGender = val);
              },
            ),
            const SizedBox(height: 12),

            TextFormField(
              controller: _departmentController,
              decoration: const InputDecoration(labelText: 'Sparte / Abteilung'),
            ),
            const SizedBox(height: 12),

            TextFormField(
              controller: _interestsController,
              decoration: const InputDecoration(labelText: 'Interessen (z.B. IT, Handwerk)'),
            ),
            const SizedBox(height: 12),

            TextFormField(
              controller: _qualificationsController,
              decoration: const InputDecoration(labelText: 'Qualifikationen'),
              maxLines: 2,
            ),
            const SizedBox(height: 12),

            TextFormField(
              controller: _helpContextController,
              decoration: const InputDecoration(labelText: 'Hilfs-Kontext (Wann & wie hilfst du?)'),
              maxLines: 2,
            ),
            const SizedBox(height: 16),

            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('⏳ Wöchentliches Zeit-Budget', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  const Text('Wie viel Zeit hast du pro Woche prinzipiell für Aufgaben zur Verfügung? (Minuten)', style: TextStyle(fontSize: 12)),
                  TextFormField(
                    controller: _timeBudgetController,
                    decoration: const InputDecoration(labelText: 'Minuten (z.B. 120)'),
                    keyboardType: TextInputType.number,
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 12),

            if (currentAge >= 18)
              CheckboxListTile(
                title: const Text('Führerschein vorhanden'),
                value: _hasDriversLicense,
                onChanged: (val) {
                  setState(() => _hasDriversLicense = val ?? false);
                },
                contentPadding: EdgeInsets.zero,
              ),

            const SizedBox(height: 24),

            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: _isSaving ? null : _saveProfile,
                child: _isSaving 
                    ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('Profil Speichern'),
              ),
            ),
          ],
        ),
      )
    );
  }
}
