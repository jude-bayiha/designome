// Generators replace this placeholder. BenchmarkScreenHost must render the full screen,
// app chrome included, with the brief's sample data and no user interaction.
package bench.tally

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier

@Composable
fun BenchmarkScreenHost(screen: BenchmarkScreen) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(screen.id)
    }
}
