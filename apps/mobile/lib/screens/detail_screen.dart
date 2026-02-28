import 'package:flutter/material.dart';

class MicroTaskDetailScreen extends StatelessWidget {
  final String microTaskId;
  
  MicroTaskDetailScreen({required this.microTaskId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('MicroTask Detail')),
      body: Center(
        child: Text('MicroTask Detail Loading for \$microTaskId...'),
      ),
    );
  }
}
