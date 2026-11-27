import 'package:flutter/widgets.dart';
import 'package:provider/provider.dart';

extension SafeProviderContext on BuildContext {
  T? maybeWatch<T>() {
    try {
      return watch<T>();
    } on ProviderNotFoundException {
      return null;
    }
  }

  T? maybeRead<T>() {
    try {
      return read<T>();
    } on ProviderNotFoundException {
      return null;
    }
  }
}
