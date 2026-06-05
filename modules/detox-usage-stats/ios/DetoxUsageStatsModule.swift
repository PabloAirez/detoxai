import ExpoModulesCore

public class DetoxUsageStatsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DetoxUsageStats")

    AsyncFunction("hasUsageAccess") {
      false
    }

    AsyncFunction("requestUsageAccess") {
      false
    }

    AsyncFunction("getUsageStats") { (_: Double, _: Double) in
      return []
    }
  }
}
