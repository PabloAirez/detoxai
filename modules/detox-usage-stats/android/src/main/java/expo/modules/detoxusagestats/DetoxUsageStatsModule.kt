package expo.modules.detoxusagestats

import android.app.AppOpsManager
import android.app.usage.UsageStats
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.Drawable
import android.os.Process
import android.provider.Settings
import android.util.Base64
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayOutputStream
import kotlin.math.max
import kotlin.math.min

data class AggregatedUsageStat(
  val packageName: String,
  var totalTimeInForeground: Long,
  var firstTimeStamp: Long,
  var lastTimeStamp: Long,
  var lastTimeUsed: Long
)

class DetoxUsageStatsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("DetoxUsageStats")

    AsyncFunction<Boolean>("hasUsageAccess") {
      hasUsageStatsPermission()
    }

    AsyncFunction<Boolean>("requestUsageAccess") {
      val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }

      context.startActivity(intent)
      true
    }

    AsyncFunction("getUsageStats") { startTime: Double, endTime: Double ->
      if (!hasUsageStatsPermission()) {
        return@AsyncFunction emptyList<Map<String, Any?>>()
      }

      val usageStatsManager =
        context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      val stats = usageStatsManager.queryUsageStats(
        UsageStatsManager.INTERVAL_DAILY,
        startTime.toLong(),
        endTime.toLong()
      )
      val packageManager = context.packageManager
      val usageByPackage = aggregateUsageStats(stats).associateBy { it.packageName }
      val installedPackageNames = packageManager
        .getInstalledApplications(0)
        .map { it.packageName }
        .toSet()
      val packageNames = installedPackageNames + usageByPackage.keys

      packageNames
        .map { packageName ->
          usageByPackage[packageName] ?: AggregatedUsageStat(
            packageName = packageName,
            totalTimeInForeground = 0,
            firstTimeStamp = startTime.toLong(),
            lastTimeStamp = endTime.toLong(),
            lastTimeUsed = 0
          )
        }
        .sortedByDescending { it.totalTimeInForeground }
        .map { usageStatToMap(it) }
    }
  }

  private fun hasUsageStatsPermission(): Boolean {
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = appOps.checkOpNoThrow(
      AppOpsManager.OPSTR_GET_USAGE_STATS,
      Process.myUid(),
      context.packageName
    )

    return mode == AppOpsManager.MODE_ALLOWED
  }

  private fun aggregateUsageStats(stats: List<UsageStats>): List<AggregatedUsageStat> {
    val usageByPackage = mutableMapOf<String, AggregatedUsageStat>()

    stats.forEach { stat ->
      val current = usageByPackage[stat.packageName]

      if (current == null) {
        usageByPackage[stat.packageName] = AggregatedUsageStat(
          packageName = stat.packageName,
          totalTimeInForeground = stat.totalTimeInForeground,
          firstTimeStamp = stat.firstTimeStamp,
          lastTimeStamp = stat.lastTimeStamp,
          lastTimeUsed = stat.lastTimeUsed
        )
      } else {
        current.totalTimeInForeground += stat.totalTimeInForeground
        current.firstTimeStamp = min(current.firstTimeStamp, stat.firstTimeStamp)
        current.lastTimeStamp = max(current.lastTimeStamp, stat.lastTimeStamp)
        current.lastTimeUsed = max(current.lastTimeUsed, stat.lastTimeUsed)
      }
    }

    return usageByPackage.values.toList()
  }

  private fun usageStatToMap(stat: AggregatedUsageStat): Map<String, Any?> {
    val packageManager = context.packageManager
    val appName = getAppName(packageManager, stat.packageName)

    return mapOf(
      "packageName" to stat.packageName,
      "appName" to appName,
      "totalTimeMillis" to stat.totalTimeInForeground.toDouble(),
      "firstTimeStamp" to stat.firstTimeStamp.toDouble(),
      "lastTimeStamp" to stat.lastTimeStamp.toDouble(),
      "lastTimeUsed" to stat.lastTimeUsed.toDouble(),
      "icon" to getAppIcon(packageManager, stat.packageName)
    )
  }

  private fun getAppName(packageManager: PackageManager, packageName: String): String {
    return try {
      val applicationInfo = packageManager.getApplicationInfo(packageName, 0)
      packageManager.getApplicationLabel(applicationInfo).toString()
    } catch (_: PackageManager.NameNotFoundException) {
      packageName
    }
  }

  private fun getAppIcon(packageManager: PackageManager, packageName: String): String? {
    return try {
      val drawable = packageManager.getApplicationIcon(packageName)
      "data:image/png;base64,${drawableToBase64(drawable)}"
    } catch (_: PackageManager.NameNotFoundException) {
      null
    }
  }

  private fun drawableToBase64(drawable: Drawable): String {
    val size = 96
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    drawable.setBounds(0, 0, canvas.width, canvas.height)
    drawable.draw(canvas)

    val outputStream = ByteArrayOutputStream()
    bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream)

    return Base64.encodeToString(outputStream.toByteArray(), Base64.NO_WRAP)
  }
}
