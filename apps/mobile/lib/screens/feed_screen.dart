import 'package:flutter/material.dart';
import 'profile_screen.dart';

class MicroTaskFeedScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('MicroTask Feed'),
        actions: [
          IconButton(
            icon: Icon(Icons.person),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => ProfileScreen(token: 'YOUR_AUTH_TOKEN_HERE'), // Adjust token later
                ),
              );
            },
          )
        ],
      ),
      body: Center(
        child: Text('MicroTask Feed Loading...'),
      ),
    );
  }
}
