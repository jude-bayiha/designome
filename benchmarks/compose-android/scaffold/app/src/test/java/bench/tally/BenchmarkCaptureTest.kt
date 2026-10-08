// Benchmark contract: do not edit. Captures every screen on the JVM with Robolectric and Roborazzi.
package bench.tally

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import com.github.takahirom.roborazzi.captureRoboImage
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.ParameterizedRobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

@RunWith(ParameterizedRobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w412dp-h915dp-port-xhdpi")
class BenchmarkCaptureTest(private val screen: BenchmarkScreen) {
    @get:Rule val compose = createComposeRule()

    @Test
    fun firstScreen() {
        compose.setContent { BenchmarkScreenHost(screen) }
        compose.onRoot().captureRoboImage("build/benchmark-captures/${screen.id}.png")
    }

    @Test
    fun tallScreen() {
        RuntimeEnvironment.setQualifiers("+h2400dp")
        compose.setContent { BenchmarkScreenHost(screen) }
        compose.onRoot().captureRoboImage("build/benchmark-captures/${screen.id}.tall.png")
    }

    companion object {
        @JvmStatic
        @ParameterizedRobolectricTestRunner.Parameters(name = "{0}")
        fun screens() = BenchmarkScreen.entries.map { arrayOf<Any>(it) }
    }
}
